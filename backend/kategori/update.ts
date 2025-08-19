import { api, APIError } from "encore.dev/api";
import { kategoriDB } from "./db";
import { Kategori } from "./create";

interface UpdateKategoriParams {
  id: string;
}

interface UpdateKategoriRequest {
  nama_kategori?: string;
  warna?: string;
  ikon?: string;
  kategori_induk_id?: string;
}

// Updates a category.
export const update = api<UpdateKategoriParams & UpdateKategoriRequest, Kategori>(
  { expose: true, method: "PUT", path: "/kategori/:id" },
  async ({ id, ...updates }) => {
    // Check if category is system default
    const existing = await kategoriDB.queryRow<{ sistem_bawaan: boolean }>`
      SELECT sistem_bawaan FROM kategori WHERE id = ${id} AND dihapus_pada IS NULL
    `;
    
    if (!existing) {
      throw APIError.notFound("category not found");
    }
    
    if (existing.sistem_bawaan) {
      throw APIError.permissionDenied("cannot update system default category");
    }
    
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.nama_kategori !== undefined) {
      setParts.push(`nama_kategori = $${paramIndex++}`);
      values.push(updates.nama_kategori);
    }
    if (updates.warna !== undefined) {
      setParts.push(`warna = $${paramIndex++}`);
      values.push(updates.warna);
    }
    if (updates.ikon !== undefined) {
      setParts.push(`ikon = $${paramIndex++}`);
      values.push(updates.ikon);
    }
    if (updates.kategori_induk_id !== undefined) {
      setParts.push(`kategori_induk_id = $${paramIndex++}`);
      values.push(updates.kategori_induk_id);
    }

    if (setParts.length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    values.push(id);
    const query = `
      UPDATE kategori 
      SET ${setParts.join(', ')}, diubah_pada = NOW()
      WHERE id = $${paramIndex} AND dihapus_pada IS NULL
      RETURNING id, tenant_id, nama_kategori, warna, ikon, kategori_induk_id, sistem_bawaan, dibuat_pada, diubah_pada
    `;

    const row = await kategoriDB.rawQueryRow<Kategori>(query, ...values);
    
    if (!row) {
      throw APIError.notFound("category not found");
    }
    
    return row;
  }
);
