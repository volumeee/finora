import { api, APIError } from "encore.dev/api";
import { Query, Header } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as crypto from "crypto";

const authDB = SQLDatabase.named("auth");
const tenantDB = SQLDatabase.named("tenant");

export interface PendingInvite {
  id: string;
  email: string;
  peran_id: number;
  nama_peran: string;
  token: string;
  kedaluwarsa: Date;
  dibuat_pada: Date;
}

interface ListInvitesParams {
  tenant_id: Query<string>;
  authorization: Header<"Authorization">;
}

interface ListInvitesResponse {
  invites: PendingInvite[];
  total: number;
}

// Lists pending invitations for a tenant.
export const listInvites = api<ListInvitesParams, ListInvitesResponse>(
  { expose: true, method: "GET", path: "/user/invites" },
  async ({ tenant_id, authorization }) => {
    const userId = extractUserIdFromToken(authorization);
    
    // Check if user has permission to view invites
    const userTenant = await tenantDB.queryRow<{ peran_id: number }>`
      SELECT peran_id
      FROM pengguna_tenant
      WHERE tenant_id = ${tenant_id} AND pengguna_id = ${userId}
    `;
    
    if (!userTenant || userTenant.peran_id > 2) { // Only owner and admin can view invites
      throw APIError.permissionDenied("insufficient permissions to view invitations");
    }
    
    const invites = await authDB.queryAll<PendingInvite>`
      SELECT 
        u.id,
        u.email,
        u.peran_id,
        CASE 
          WHEN u.peran_id = 1 THEN 'Pemilik'
          WHEN u.peran_id = 2 THEN 'Admin'
          WHEN u.peran_id = 3 THEN 'Editor'
          WHEN u.peran_id = 4 THEN 'Pembaca'
          ELSE 'Unknown'
        END as nama_peran,
        u.token,
        u.kedaluwarsa,
        u.dibuat_pada
      FROM undangan u
      WHERE u.tenant_id = ${tenant_id} AND u.diterima_pada IS NULL AND u.kedaluwarsa > NOW()
      ORDER BY u.dibuat_pada DESC
    `;
    
    const countRow = await authDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count
      FROM undangan
      WHERE tenant_id = ${tenant_id} AND diterima_pada IS NULL AND kedaluwarsa > NOW()
    `;
    
    return {
      invites,
      total: countRow?.count || 0
    };
  }
);

function extractUserIdFromToken(authHeader: string): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw APIError.unauthenticated("missing or invalid authorization header");
  }
  
  const token = authHeader.substring(7);
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    throw APIError.unauthenticated("invalid token format");
  }
  
  try {
    const [header, payload, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', 'your-secret-key')
      .update(`${header}.${payload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      throw APIError.unauthenticated("invalid token signature");
    }
    
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      throw APIError.unauthenticated("token expired");
    }
    
    return decodedPayload.sub;
  } catch (error) {
    throw APIError.unauthenticated("invalid token");
  }
}