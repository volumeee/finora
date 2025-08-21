import { api, APIError } from "encore.dev/api";
import { tujuanDB } from "./db";
import { TujuanTabungan } from "./create";

interface GetTujuanParams {
  id: string;
}

// Retrieves a savings goal by ID.
export const get = api<GetTujuanParams, TujuanTabungan>(
  { expose: true, method: "GET", path: "/tujuan/:id" },
  async ({ id }) => {
    const row = await tujuanDB.queryRow<TujuanTabungan>`
      SELECT id, tenant_id, nama_tujuan, jenis_tujuan, target_nominal, nominal_terkumpul, tenggat_tanggal, catatan, dibuat_pada, diubah_pada
      FROM tujuan_tabungan
      WHERE id = ${id} AND dihapus_pada IS NULL
    `;
    
    if (!row) {
      throw APIError.notFound("savings goal not found");
    }
    
    // Convert from cents
    return {
      ...row,
      target_nominal: row.target_nominal / 100,
      nominal_terkumpul: row.nominal_terkumpul / 100,
    };
  }
);
