import { api, APIError } from "encore.dev/api";
import { tenantDB } from "./db";

interface DeleteTenantParams {
  id: string;
}

// Soft deletes a tenant.
export const deleteTenant = api<DeleteTenantParams, void>(
  { expose: true, method: "DELETE", path: "/tenant/:id" },
  async ({ id }) => {
    const result = await tenantDB.exec`
      UPDATE tenants 
      SET dihapus_pada = NOW()
      WHERE id = ${id} AND dihapus_pada IS NULL
    `;
    
    // Note: Encore.ts doesn't provide affected rows count directly
    // In a real implementation, you might want to check if the tenant exists first
  }
);
