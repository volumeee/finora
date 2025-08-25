import { api } from "encore.dev/api";
import { akunDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const transaksiDB = SQLDatabase.named("transaksi");

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
  pengguna_id: string;
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
    let saldo = Math.round((req.saldo_awal ?? 0) * 100);
    
    // For debt accounts (pinjaman, kartu_kredit), initial balance should be negative (debt)
    const isDebtAccount = ['pinjaman', 'kartu_kredit'].includes(req.jenis);
    if (isDebtAccount && saldo > 0) {
      saldo = -saldo; // Convert to negative (debt)
    }

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

    // Create initial balance entry in transaction history if saldo_awal != 0
    if (saldo !== 0) {
      const isDebtAccount = ['pinjaman', 'kartu_kredit'].includes(req.jenis);
      const transactionType = isDebtAccount ? 'pengeluaran' : 'pemasukan';
      const transactionAmount = Math.abs(saldo); // Always positive for transaction record
      const description = isDebtAccount 
        ? `Saldo awal ${req.jenis} (utang)` 
        : 'Saldo awal akun';
      
      await transaksiDB.exec`
        INSERT INTO transaksi (
          tenant_id, akun_id, jenis, nominal, mata_uang, 
          tanggal_transaksi, catatan, pengguna_id
        ) VALUES (
          ${req.tenant_id}, ${row.id}, ${transactionType}, ${transactionAmount}, ${mataUang},
          CURRENT_DATE, ${description}, ${req.pengguna_id}
        )
      `;
    }

    // convert kembali ke normal (rupiah) sebelum return
    return {
      ...row,
      saldo_awal: row.saldo_awal / 100,
      saldo_terkini: row.saldo_terkini / 100,
    };
  }
);
