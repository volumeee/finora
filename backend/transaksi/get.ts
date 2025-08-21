import { api, APIError } from "encore.dev/api";
import { transaksiDB } from "./db";
import { Transaksi, SplitKategori } from "./create";

interface GetTransaksiParams {
  id: string;
}

// Retrieves a transaction by ID.
export const get = api<GetTransaksiParams, Transaksi>(
  { expose: true, method: "GET", path: "/transaksi/:id" },
  async ({ id }) => {
    const row = await transaksiDB.queryRow<Transaksi>`
      SELECT id, tenant_id, akun_id, kategori_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id, transaksi_berulang_id, dibuat_pada, diubah_pada
      FROM transaksi
      WHERE id = ${id} AND dihapus_pada IS NULL
    `;
    
    if (!row) {
      throw APIError.notFound("transaction not found");
    }
    
    // Get split categories and convert from cents
    const splits = await transaksiDB.queryAll<SplitKategori>`
      SELECT kategori_id, nominal_split
      FROM detail_transaksi_split
      WHERE transaksi_id = ${id}
    `;
    
    if (splits.length > 0) {
      row.split_kategori = splits.map(s => ({
        ...s,
        nominal_split: s.nominal_split / 100
      }));
    }
    
    // Convert nominal from cents
    return {
      ...row,
      nominal: row.nominal / 100,
    };
  }
);
