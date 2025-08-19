import { api } from "encore.dev/api";
import { kategoriDB } from "./db";

export interface CreateKategoriRequest {
  tenant_id: string;
  nama_kategori: string;
  warna?: string;
  ikon?: string;
  kategori_induk_id?: string;
}

export interface Kategori {
  id: string;
  tenant_id?: string;
  nama_kategori: string;
  warna: string;
  ikon: string;
  kategori_induk_id?: string;
  sistem_bawaan: boolean;
  dibuat_pada: Date;
  diubah_pada: Date;
}

// Creates a new category.
export const create = api<CreateKategoriRequest, Kategori>(
  { expose: true, method: "POST", path: "/kategori" },
  async (req) => {
    const row = await kategoriDB.queryRow<Kategori>`
      INSERT INTO kategori (tenant_id, nama_kategori, warna, ikon, kategori_induk_id, sistem_bawaan)
      VALUES (${req.tenant_id}, ${req.nama_kategori}, ${req.warna || '#6b7280'}, ${req.ikon || 'help-circle'}, ${req.kategori_induk_id}, false)
      RETURNING id, tenant_id, nama_kategori, warna, ikon, kategori_induk_id, sistem_bawaan, dibuat_pada, diubah_pada
    `;
    
    if (!row) {
      throw new Error("Failed to create category");
    }
    
    return row;
  }
);
