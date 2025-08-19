import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { tenantDB } from "./db";
import { Tenant } from "./create";

interface ListTenantsParams {
  limit?: Query<number>;
  offset?: Query<number>;
}

interface ListTenantsResponse {
  tenants: Tenant[];
  total: number;
}

// Retrieves all tenants with pagination.
export const list = api<ListTenantsParams, ListTenantsResponse>(
  { expose: true, method: "GET", path: "/tenant" },
  async ({ limit = 10, offset = 0 }) => {
    const tenants = await tenantDB.queryAll<Tenant>`
      SELECT id, nama, sub_domain, zona_waktu, logo_url, dibuat_pada, diubah_pada
      FROM tenants
      WHERE dihapus_pada IS NULL
      ORDER BY dibuat_pada DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    const countRow = await tenantDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count
      FROM tenants
      WHERE dihapus_pada IS NULL
    `;
    
    return {
      tenants,
      total: countRow?.count || 0
    };
  }
);
