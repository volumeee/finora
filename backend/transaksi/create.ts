import { api } from "encore.dev/api";
import { transaksiDB } from "./db";
import { updateBalance } from "../akun/update_balance";
import { get as getAkun } from "../akun/get";

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
    // Validate required fields
    if (!req.tenant_id || !req.akun_id || !req.jenis || !req.nominal || !req.tanggal_transaksi || !req.pengguna_id) {
      throw new Error("Missing required fields");
    }

    // Validate jenis
    if (!['pengeluaran', 'pemasukan', 'transfer'].includes(req.jenis)) {
      throw new Error("Invalid transaction type");
    }

    // Validate nominal
    if (req.nominal <= 0) {
      throw new Error("Nominal harus lebih dari 0");
    }
    
    // Validate maximum amount (1 billion IDR)
    if (req.nominal > 1000000000) {
      throw new Error("Nominal melebihi batas maksimum");
    }

    // Get account info for validation
    const account = await getAkun({ id: req.akun_id });
    
    // Validate transaction type based on account type
    const isDebtAccount = ['pinjaman', 'kartu_kredit'].includes(account.jenis);
    
    if (isDebtAccount && req.jenis === "pemasukan") {
      throw new Error("Akun utang (pinjaman/kartu kredit) tidak bisa menerima pemasukan langsung. Gunakan transfer dari akun lain untuk pembayaran.");
    }
    
    // For expense transactions on non-debt accounts, check if account has sufficient balance
    if (req.jenis === "pengeluaran" && !isDebtAccount) {
      if (account.saldo_terkini < req.nominal) {
        throw new Error("Saldo tidak mencukupi untuk pengeluaran ini");
      }
    }
    // Start transaction
    const tx = await transaksiDB.begin();

    try {
      // Convert to cents for database
      const nominalCents = Math.round(req.nominal * 100);

      // Insert main transaction
      const transaksi = await tx.queryRow<Transaksi>`
        INSERT INTO transaksi (tenant_id, akun_id, kategori_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id)
        VALUES (${req.tenant_id}, ${req.akun_id}, ${req.kategori_id}, ${
        req.jenis
      }, ${nominalCents}, ${req.mata_uang || "IDR"}, ${
        req.tanggal_transaksi
      }, ${req.catatan}, ${req.pengguna_id})
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

      // Update account balance via akun service after successful commit
      const isDebtAccount = ['pinjaman', 'kartu_kredit'].includes(account.jenis);
      
      if (transaksi.jenis === "pemasukan") {
        await updateBalance({
          akun_id: req.akun_id,
          amount: nominalCents,
          operation: "add"
        });
      } else if (transaksi.jenis === "pengeluaran") {
        if (isDebtAccount) {
          // For debt accounts, expense increases debt (makes balance more negative)
          await updateBalance({
            akun_id: req.akun_id,
            amount: nominalCents,
            operation: "subtract"
          });
        } else {
          // For normal accounts, expense decreases balance
          await updateBalance({
            akun_id: req.akun_id,
            amount: nominalCents,
            operation: "subtract"
          });
        }
      }

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
