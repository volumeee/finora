import { api } from "encore.dev/api";
import { akunDB } from "./db";

export type JenisAkun =
  | "kas"
  | "bank"
  | "e_wallet"
  | "kartu_kredit"
  | "pinjaman"
  | "aset";

export interface CreateAkunRequest {
  tenant_id: string;
  nama_akun: string;
  jenis: JenisAkun;
  mata_uang?: string;
  saldo_awal?: number;
  keterangan?: string;
}

export interface Akun {
  id: string;
  tenant_id: string;
  nama_akun: string;
  jenis: JenisAkun;
  mata_uang: string;
  saldo_awal: number;
  saldo_terkini: number;
  keterangan?: string;
  dibuat_pada: Date;
  diubah_pada: Date;
  dihapus_pada?: Date | null; // optional kalau soft delete dipakai
}

// Creates a new account.
export const create = api<CreateAkunRequest, Akun>(
  { expose: true, method: "POST", path: "/akun" },
  async (req) => {
    if (!req.tenant_id || !req.nama_akun || !req.jenis) {
      throw new Error("Missing required fields");
    }

    const mataUang = req.mata_uang || "IDR";
    // simpan ke DB sebagai cents (BIGINT)
    const saldo = Math.round((req.saldo_awal ?? 0) * 100);

    const row = await akunDB.queryRow<{
      id: string;
      tenant_id: string;
      nama_akun: string;
      jenis: JenisAkun;
      mata_uang: string;
      saldo_awal: number;
      saldo_terkini: number;
      keterangan?: string;
      dibuat_pada: Date;
      diubah_pada: Date;
    }>`
      INSERT INTO akun (
        tenant_id, nama_akun, jenis, mata_uang,
        saldo_awal, saldo_terkini, keterangan
      ) VALUES (
        ${req.tenant_id},
        ${req.nama_akun},
        ${req.jenis},
        ${mataUang},
        ${saldo},
        ${saldo},
        ${req.keterangan || null}
      )
      RETURNING id, tenant_id, nama_akun, jenis, mata_uang,
                saldo_awal, saldo_terkini, keterangan,
                dibuat_pada, diubah_pada;
    `;

    if (!row) throw new Error("Failed to create account");

    // convert kembali ke normal (rupiah) sebelum return
    return {
      ...row,
      saldo_awal: row.saldo_awal / 100,
      saldo_terkini: row.saldo_terkini / 100,
    };
  }
);
