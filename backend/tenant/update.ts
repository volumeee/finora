import { api, APIError } from "encore.dev/api";
import { tenantDB } from "./db";
import { Tenant } from "./create";

interface UpdateTenantParams {
  id: string;
}

interface UpdateTenantRequest {
  nama?: string;
  sub_domain?: string;
  zona_waktu?: string;
  logo_url?: string;
}

// Updates a tenant.
export const update = api<UpdateTenantParams & UpdateTenantRequest, Tenant>(
  { expose: true, method: "PUT", path: "/tenant/:id" },
  async ({ id, ...updates }) => {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.nama !== undefined) {
      setParts.push(`nama = $${paramIndex++}`);
      values.push(updates.nama);
    }
    if (updates.sub_domain !== undefined) {
      setParts.push(`sub_domain = $${paramIndex++}`);
      values.push(updates.sub_domain);
    }
    if (updates.zona_waktu !== undefined) {
      setParts.push(`zona_waktu = $${paramIndex++}`);
      values.push(updates.zona_waktu);
    }
    if (updates.logo_url !== undefined) {
      setParts.push(`logo_url = $${paramIndex++}`);
      values.push(updates.logo_url);
    }

    if (setParts.length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    values.push(id);
    const query = `
      UPDATE tenants 
      SET ${setParts.join(', ')}, diubah_pada = NOW()
      WHERE id = $${paramIndex} AND dihapus_pada IS NULL
      RETURNING id, nama, sub_domain, zona_waktu, logo_url, dibuat_pada, diubah_pada
    `;

    const row = await tenantDB.rawQueryRow<Tenant>(query, ...values);
    
    if (!row) {
      throw APIError.notFound("tenant not found");
    }
    
    return row;
  }
);
