import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { transaksiDB } from "./db";
import { Transaksi } from "./create";

interface GetTransaksiParams {
  id: string;
}

// Gets a single transaction by ID.
export const get = api<GetTransaksiParams, Transaksi>(
  { expose: true, method: "GET", path: "/transaksi/:id" },
  async ({ id }) => {
    const row = await transaksiDB.queryRow<{
      id: string;
      tenant_id: string;
      akun_id: string;
      kategori_id: string;
      jenis: string;
      nominal: string;
      mata_uang: string;
      tanggal_transaksi: string;
      catatan?: string;
      pengguna_id: string;
      transaksi_berulang_id?: string;
      dibuat_pada: string;
      diubah_pada: string;
    }>`
      SELECT
        id,
        tenant_id,
        akun_id,
        kategori_id,
        jenis,
        nominal::text AS nominal,
        mata_uang,
        tanggal_transaksi::text AS tanggal_transaksi,
        catatan,
        pengguna_id,
        transaksi_berulang_id,
        dibuat_pada,
        diubah_pada
      FROM transaksi
      WHERE id = ${id} AND dihapus_pada IS NULL
    `;
    
    if (!row) {
      throw new Error("Transaction not found");
    }
    
    return {
      ...row,
      nominal: parseInt(row.nominal, 10) / 100,
    };
  }
);