import { api, APIError } from "encore.dev/api";
import { kategoriDB } from "./db";

interface DeleteKategoriParams {
  id: string;
}

// Soft deletes a category.
export const deleteKategori = api<DeleteKategoriParams, void>(
  { expose: true, method: "DELETE", path: "/kategori/:id" },
  async ({ id }) => {
    // Check if category is system default
    const existing = await kategoriDB.queryRow<{ sistem_bawaan: boolean }>`
      SELECT sistem_bawaan FROM kategori WHERE id = ${id} AND dihapus_pada IS NULL
    `;
    
    if (!existing) {
      throw APIError.notFound("category not found");
    }
    
    if (existing.sistem_bawaan) {
      throw APIError.permissionDenied("cannot delete system default category");
    }
    
    await kategoriDB.exec`
      UPDATE kategori 
      SET dihapus_pada = NOW()
      WHERE id = ${id} AND dihapus_pada IS NULL
    `;
  }
);
