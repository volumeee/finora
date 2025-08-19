import { api } from "encore.dev/api";
import { tenantDB } from "./db";

export interface CreateTenantRequest {
  nama: string;
  sub_domain: string;
  zona_waktu?: string;
  logo_url?: string;
}

export interface Tenant {
  id: string;
  nama: string;
  sub_domain: string;
  zona_waktu: string;
  logo_url?: string;
  dibuat_pada: Date;
  diubah_pada: Date;
}

// Creates a new tenant.
export const create = api<CreateTenantRequest, Tenant>(
  { expose: true, method: "POST", path: "/tenant" },
  async (req) => {
    const row = await tenantDB.queryRow<Tenant>`
      INSERT INTO tenants (nama, sub_domain, zona_waktu, logo_url)
      VALUES (${req.nama}, ${req.sub_domain}, ${req.zona_waktu || 'Asia/Jakarta'}, ${req.logo_url})
      RETURNING id, nama, sub_domain, zona_waktu, logo_url, dibuat_pada, diubah_pada
    `;
    
    if (!row) {
      throw new Error("Failed to create tenant");
    }
    
    return row;
  }
);
