import { api } from "encore.dev/api";
import { transaksiDB } from "./db";

export type JenisTransaksi = "pengeluaran" | "pemasukan" | "transfer";

export interface CreateTransaksiRequest {
  tenant_id: string;
  akun_id: string;
  kategori_id?: string;
  jenis: JenisTransaksi;
  nominal: number;
  mata_uang?: string;
  tanggal_transaksi: string; // YYYY-MM-DD format
  catatan?: string;
  pengguna_id: string;
  split_kategori?: SplitKategori[];
}

export interface SplitKategori {
  kategori_id: string;
  nominal_split: number;
}

export interface Transaksi {
  id: string;
  tenant_id: string;
  akun_id: string;
  kategori_id?: string;
  jenis: JenisTransaksi;
  nominal: number;
  mata_uang: string;
  tanggal_transaksi: string;
  catatan?: string;
  pengguna_id: string;
  transaksi_berulang_id?: string;
  dibuat_pada: Date;
  diubah_pada: Date;
  split_kategori?: SplitKategori[];
}

// Creates a new transaction.
export const create = api<CreateTransaksiRequest, Transaksi>(
  { expose: true, method: "POST", path: "/transaksi" },
  async (req) => {
    // Start transaction
    const tx = await transaksiDB.begin();
    
    try {
      // Convert to cents for database
      const nominalCents = Math.round(req.nominal * 100);
      
      // Insert main transaction
      const transaksi = await tx.queryRow<Transaksi>`
        INSERT INTO transaksi (tenant_id, akun_id, kategori_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id)
        VALUES (${req.tenant_id}, ${req.akun_id}, ${req.kategori_id}, ${req.jenis}, ${nominalCents}, ${req.mata_uang || 'IDR'}, ${req.tanggal_transaksi}, ${req.catatan}, ${req.pengguna_id})
        RETURNING id, tenant_id, akun_id, kategori_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id, transaksi_berulang_id, dibuat_pada, diubah_pada
      `;
      
      if (!transaksi) {
        throw new Error("Failed to create transaction");
      }
      
      // Insert split categories if provided
      if (req.split_kategori && req.split_kategori.length > 0) {
        const splitKategori = [];
        for (const split of req.split_kategori) {
          const splitCents = Math.round(split.nominal_split * 100);
          await tx.exec`
            INSERT INTO detail_transaksi_split (transaksi_id, kategori_id, nominal_split)
            VALUES (${transaksi.id}, ${split.kategori_id}, ${splitCents})
          `;
          splitKategori.push(split);
        }
        transaksi.split_kategori = splitKategori;
      }
      
      await tx.commit();
      
      // Convert back to normal numbers
      return {
        ...transaksi,
        nominal: transaksi.nominal / 100,
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);
