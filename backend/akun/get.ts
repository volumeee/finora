import { api, APIError } from "encore.dev/api";
import { akunDB } from "./db";
import { Akun } from "./create";

interface GetAkunParams {
  id: string;
}

// Retrieves an account by ID.
export const get = api<GetAkunParams, Akun>(
  { expose: true, method: "GET", path: "/akun/:id" },
  async ({ id }) => {
    const row = await akunDB.queryRow<Akun>`
      SELECT id, tenant_id, nama_akun, jenis, mata_uang, saldo_awal, saldo_terkini, keterangan, dibuat_pada, diubah_pada
      FROM akun
      WHERE id = ${id} AND dihapus_pada IS NULL
    `;

    if (!row) {
      throw APIError.notFound("account not found");
    }

    // konversi dari bigint cents → normal
    return {
      ...row,
      saldo_awal: Number(row.saldo_awal) / 100,
      saldo_terkini: Number(row.saldo_terkini) / 100,
    };
  }
);
