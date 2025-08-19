import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const tenantDB = SQLDatabase.named("tenant");

export interface TenantMember {
  id: string;
  nama_lengkap: string;
  email: string;
  avatar_url?: string;
  peran_id: number;
  nama_peran: string;
  bergabung_pada: Date;
}

interface ListMembersParams {
  tenant_id: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

interface ListMembersResponse {
  members: TenantMember[];
  total: number;
}

// Retrieves all members of a tenant.
export const listMembers = api<ListMembersParams, ListMembersResponse>(
  { expose: true, method: "GET", path: "/user/members" },
  async ({ tenant_id, limit = 50, offset = 0 }) => {
    const members = await tenantDB.queryAll<TenantMember>`
      SELECT 
        p.id,
        p.nama_lengkap,
        p.email,
        p.avatar_url,
        pt.peran_id,
        pr.nama_peran,
        pt.bergabung_pada
      FROM pengguna_tenant pt
      JOIN pengguna p ON pt.pengguna_id = p.id
      JOIN peran pr ON pt.peran_id = pr.id
      WHERE pt.tenant_id = ${tenant_id} AND p.dihapus_pada IS NULL
      ORDER BY pt.peran_id ASC, pt.bergabung_pada ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    const countRow = await tenantDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count
      FROM pengguna_tenant pt
      JOIN pengguna p ON pt.pengguna_id = p.id
      WHERE pt.tenant_id = ${tenant_id} AND p.dihapus_pada IS NULL
    `;
    
    return {
      members,
      total: countRow?.count || 0
    };
  }
);
