import { api, APIError } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as bcrypt from "bcrypt";

const authDB = SQLDatabase.named("auth");
const tenantDB = SQLDatabase.named("tenant");

export interface AcceptInviteRequest {
  token: string;
  nama_lengkap?: string;
  kata_sandi?: string;
  no_telepon?: string;
}

export interface AcceptInviteResponse {
  pengguna: {
    id: string;
    nama_lengkap: string;
    email: string;
  };
  tenant: {
    id: string;
    nama: string;
    sub_domain: string;
  };
  peran: string;
  is_new_user: boolean;
}

// Accepts an invitation to join a tenant.
export const acceptInvite = api<AcceptInviteRequest, AcceptInviteResponse>(
  { expose: true, method: "POST", path: "/user/accept-invite" },
  async (req) => {
    const authTx = await authDB.begin();
    const tenantTx = await tenantDB.begin();
    
    try {
      // Find valid invitation
      const invitation = await authTx.queryRow<{
        id: string;
        tenant_id: string;
        email: string;
        peran_id: number;
        diterima_pada?: Date;
      }>`
        SELECT id, tenant_id, email, peran_id, diterima_pada
        FROM undangan
        WHERE token = ${req.token} AND kedaluwarsa > NOW()
      `;
      
      if (!invitation) {
        throw APIError.notFound("invalid or expired invitation");
      }
      
      if (invitation.diterima_pada) {
        throw APIError.alreadyExists("invitation already accepted");
      }
      
      // Check if user already exists (case-insensitive)
      let pengguna = await tenantTx.queryRow<{
        id: string;
        nama_lengkap: string;
        email: string;
      }>`
        SELECT id, nama_lengkap, email
        FROM pengguna
        WHERE LOWER(email) = LOWER(${invitation.email}) AND dihapus_pada IS NULL
      `;
      
      let isNewUser = false;
      
      if (!pengguna) {
        // Create new user
        if (!req.nama_lengkap || !req.kata_sandi) {
          throw APIError.invalidArgument("nama_lengkap and kata_sandi required for new users");
        }
        
        const kataSandiHash = await bcrypt.hash(req.kata_sandi, 10);
        
        pengguna = await tenantTx.queryRow<{
          id: string;
          nama_lengkap: string;
          email: string;
        }>`
          INSERT INTO pengguna (nama_lengkap, email, kata_sandi_hash, no_telepon)
          VALUES (${req.nama_lengkap}, ${invitation.email.toLowerCase()}, ${kataSandiHash}, ${req.no_telepon})
          RETURNING id, nama_lengkap, email
        `;
        
        if (!pengguna) {
          throw new Error("Failed to create user");
        }
        
        isNewUser = true;
      }
      
      // Add user to tenant
      await tenantTx.exec`
        INSERT INTO pengguna_tenant (tenant_id, pengguna_id, peran_id)
        VALUES (${invitation.tenant_id}, ${pengguna.id}, ${invitation.peran_id})
      `;
      
      // Mark invitation as accepted
      await authTx.exec`
        UPDATE undangan
        SET diterima_pada = NOW()
        WHERE id = ${invitation.id}
      `;
      
      // Get tenant and role info
      const tenantInfo = await tenantTx.queryRow<{
        id: string;
        nama: string;
        sub_domain: string;
        peran: string;
      }>`
        SELECT t.id, t.nama, t.sub_domain, p.nama_peran as peran
        FROM tenants t
        JOIN peran p ON p.id = ${invitation.peran_id}
        WHERE t.id = ${invitation.tenant_id}
      `;
      
      if (!tenantInfo) {
        throw new Error("Failed to get tenant info");
      }
      
      await authTx.commit();
      await tenantTx.commit();
      
      return {
        pengguna,
        tenant: {
          id: tenantInfo.id,
          nama: tenantInfo.nama,
          sub_domain: tenantInfo.sub_domain
        },
        peran: tenantInfo.peran,
        is_new_user: isNewUser
      };
    } catch (error) {
      await authTx.rollback();
      await tenantTx.rollback();
      throw error;
    }
  }
);
