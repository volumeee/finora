import { api } from "encore.dev/api";
import { transaksiDB } from "./db";
import { Transaksi } from "./create";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const akunDB = SQLDatabase.named("akun");
const tujuanDB = SQLDatabase.named("tujuan");

export interface CreateTransferRequest {
  tenant_id: string;
  akun_asal_id: string;
  akun_tujuan_id: string;
  nominal: number;
  mata_uang?: string;
  tanggal_transaksi: string;
  catatan?: string;
  pengguna_id: string;
}

export interface Transfer {
  id: string;
  transaksi_keluar: Transaksi;
  transaksi_masuk: Transaksi;
  dibuat_pada: Date;
}

// Creates a transfer between two accounts.
export const createTransfer = api<CreateTransferRequest, Transfer>(
  { expose: true, method: "POST", path: "/transaksi/transfer" },
  async (req) => {
    const tx = await transaksiDB.begin();

    try {
      // Convert to cents for database (ensure BigInt compatibility)
      const nominalCents = BigInt(Math.round(req.nominal * 100));

      // Create outgoing transaction
      const transaksiKeluar = await tx.queryRow<Transaksi>`
        INSERT INTO transaksi (tenant_id, akun_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id)
        VALUES (${req.tenant_id}, ${
        req.akun_asal_id
      }, 'transfer', ${nominalCents}, ${req.mata_uang || "IDR"}, ${
        req.tanggal_transaksi
      }, ${req.catatan}, ${req.pengguna_id})
        RETURNING id, tenant_id, akun_id, kategori_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id, transaksi_berulang_id, dibuat_pada, diubah_pada
      `;

      if (!transaksiKeluar) {
        throw new Error("Failed to create outgoing transaction");
      }

      // Check if destination is a savings goal
      const isGoal = await tujuanDB.queryRow`SELECT id FROM tujuan_tabungan WHERE id = ${req.akun_tujuan_id}`;
      
      let transaksiMasuk: Transaksi;
      let transfer: { id: string; dibuat_pada: Date };
      
      if (isGoal) {
        // Create contribution to savings goal
        await tujuanDB.exec`
          INSERT INTO kontribusi_tujuan (tujuan_tabungan_id, transaksi_id, nominal_kontribusi, tanggal_kontribusi)
          VALUES (${req.akun_tujuan_id}, ${transaksiKeluar.id}, ${nominalCents}, ${req.tanggal_transaksi})
        `;
        
        // Create a dummy incoming transaction for consistency
        transaksiMasuk = {
          ...transaksiKeluar,
          id: `goal-${req.akun_tujuan_id}`,
          akun_id: req.akun_tujuan_id,
        };
        
        transfer = {
          id: `transfer-to-goal-${Date.now()}`,
          dibuat_pada: new Date(),
        };
        
        // Only deduct from source account using safe function
        await tx.exec`UPDATE akun SET saldo_terkini = safe_bigint_subtract(saldo_terkini, ${nominalCents}) WHERE id = ${req.akun_asal_id}`;
      } else {
        // Regular account transfer
        transaksiMasuk = await tx.queryRow<Transaksi>`
          INSERT INTO transaksi (tenant_id, akun_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id)
          VALUES (${req.tenant_id}, ${
          req.akun_tujuan_id
        }, 'transfer', ${nominalCents}, ${req.mata_uang || "IDR"}, ${
          req.tanggal_transaksi
        }, ${req.catatan}, ${req.pengguna_id})
          RETURNING id, tenant_id, akun_id, kategori_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id, transaksi_berulang_id, dibuat_pada, diubah_pada
        `;

        if (!transaksiMasuk) {
          throw new Error("Failed to create incoming transaction");
        }

        // Create transfer record
        const transferRecord = await tx.queryRow<{ id: string; dibuat_pada: Date }>`
          INSERT INTO transfer_antar_akun (transaksi_keluar_id, transaksi_masuk_id)
          VALUES (${transaksiKeluar.id}, ${transaksiMasuk.id})
          RETURNING id, dibuat_pada
        `;

        if (!transferRecord) {
          throw new Error("Failed to create transfer record");
        }
        
        transfer = transferRecord;

        // Update both account balances using safe functions within transaction
        await tx.exec`UPDATE akun SET saldo_terkini = safe_bigint_subtract(saldo_terkini, ${nominalCents}) WHERE id = ${req.akun_asal_id}`;
        await tx.exec`UPDATE akun SET saldo_terkini = safe_bigint_add(saldo_terkini, ${nominalCents}) WHERE id = ${req.akun_tujuan_id}`;
      }

      await tx.commit();

      // Convert back from cents
      return {
        id: transfer.id,
        transaksi_keluar: {
          ...transaksiKeluar,
          nominal: Number(transaksiKeluar.nominal) / 100,
        },
        transaksi_masuk: {
          ...transaksiMasuk,
          nominal: Number(transaksiMasuk.nominal) / 100,
        },
        dibuat_pada: transfer.dibuat_pada,
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);
