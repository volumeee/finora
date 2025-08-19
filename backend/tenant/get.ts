import { api, APIError } from "encore.dev/api";
import { tenantDB } from "./db";
import { Tenant } from "./create";

interface GetTenantParams {
  id: string;
}

// Retrieves a tenant by ID.
export const get = api<GetTenantParams, Tenant>(
  { expose: true, method: "GET", path: "/tenant/:id" },
  async ({ id }) => {
    const row = await tenantDB.queryRow<Tenant>`
      SELECT id, nama, sub_domain, zona_waktu, logo_url, dibuat_pada, diubah_pada
      FROM tenants
      WHERE id = ${id} AND dihapus_pada IS NULL
    `;
    
    if (!row) {
      throw APIError.notFound("tenant not found");
    }
    
    return row;
  }
);
