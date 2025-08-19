import { api, APIError } from "encore.dev/api";
import { kategoriDB } from "./db";
import { Kategori } from "./create";

interface GetKategoriParams {
  id: string;
}

// Retrieves a category by ID.
export const get = api<GetKategoriParams, Kategori>(
  { expose: true, method: "GET", path: "/kategori/:id" },
  async ({ id }) => {
    const row = await kategoriDB.queryRow<Kategori>`
      SELECT id, tenant_id, nama_kategori, warna, ikon, kategori_induk_id, sistem_bawaan, dibuat_pada, diubah_pada
      FROM kategori
      WHERE id = ${id} AND dihapus_pada IS NULL
    `;
    
    if (!row) {
      throw APIError.notFound("category not found");
    }
    
    return row;
  }
);
