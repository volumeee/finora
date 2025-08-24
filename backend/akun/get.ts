import { api, APIError } from "encore.dev/api";
import { akunDB } from "./db";
import { Akun } from "./create";

interface GetAkunParams {
  id: string;
}

export interface AkunWithBalance extends Akun {
  saldo_tersedia: number;
  status_saldo: 'cukup' | 'rendah' | 'kosong';
}

// Retrieves an account by ID with balance information.
export const get = api<GetAkunParams, AkunWithBalance>(
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
    const saldo_awal = Number(row.saldo_awal) / 100;
    const saldo_terkini = Number(row.saldo_terkini) / 100;
    
    // Determine balance status
    let status_saldo: 'cukup' | 'rendah' | 'kosong';
    if (saldo_terkini <= 0) {
      status_saldo = 'kosong';
    } else if (saldo_terkini < 100000) { // Less than 100k IDR
      status_saldo = 'rendah';
    } else {
      status_saldo = 'cukup';
    }

    return {
      ...row,
      saldo_awal,
      saldo_terkini,
      saldo_tersedia: saldo_terkini,
      status_saldo,
    };
  }
);
