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
    // Validate input
    if (req.nominal <= 0) {
      throw new Error("Nominal transfer harus lebih dari 0");
    }
    
    if (req.akun_asal_id === req.akun_tujuan_id) {
      throw new Error("Akun asal dan tujuan tidak boleh sama");
    }

    // Convert to cents for database
    const nominalCents = Math.round(req.nominal * 100);

    // Check source account exists and has sufficient balance
    const sourceAccount = await akunDB.queryRow<{id: string, nama_akun: string, saldo_terkini: string}>`
      SELECT id, nama_akun, saldo_terkini::text FROM akun 
      WHERE id = ${req.akun_asal_id} AND tenant_id = ${req.tenant_id} AND dihapus_pada IS NULL
    `;
    
    if (!sourceAccount) {
      throw new Error("Akun asal tidak ditemukan");
    }
    
    const currentBalance = parseInt(sourceAccount.saldo_terkini);
    if (currentBalance < nominalCents) {
      const saldoTersedia = currentBalance / 100;
      const nominalDiminta = req.nominal;
      throw new Error(`Saldo tidak mencukupi. Saldo tersedia: Rp ${saldoTersedia.toLocaleString('id-ID')}, nominal yang diminta: Rp ${nominalDiminta.toLocaleString('id-ID')}`);
    }

    // Check destination account/goal exists
    const destAccount = await akunDB.queryRow`
      SELECT id FROM akun WHERE id = ${req.akun_tujuan_id} AND tenant_id = ${req.tenant_id} AND dihapus_pada IS NULL
    `;
    
    const destGoal = await tujuanDB.queryRow`
      SELECT id FROM tujuan_tabungan WHERE id = ${req.akun_tujuan_id} AND tenant_id = ${req.tenant_id} AND dihapus_pada IS NULL
    `;
    
    if (!destAccount && !destGoal) {
      throw new Error("Akun atau tujuan tidak ditemukan");
    }

    const tx = await transaksiDB.begin();

    try {

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
      const isGoal = destGoal;
      
      let transaksiMasuk: Transaksi;
      let transfer: { id: string; dibuat_pada: Date };
      
      if (isGoal) {
        // Create actual incoming transaction for goal
        transaksiMasuk = await tx.queryRow<Transaksi>`
          INSERT INTO transaksi (tenant_id, akun_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id)
          VALUES (${req.tenant_id}, ${req.akun_tujuan_id}, 'transfer', ${nominalCents}, ${req.mata_uang || "IDR"}, ${req.tanggal_transaksi}, 'Kontribusi tujuan tabungan', ${req.pengguna_id})
          RETURNING id, tenant_id, akun_id, kategori_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id, transaksi_berulang_id, dibuat_pada, diubah_pada
        `;

        if (!transaksiMasuk) {
          throw new Error("Failed to create goal transaction");
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
        
        // Create contribution to savings goal
        await tujuanDB.exec`
          INSERT INTO kontribusi_tujuan (tujuan_tabungan_id, transaksi_id, nominal_kontribusi, tanggal_kontribusi)
          VALUES (${req.akun_tujuan_id}, ${transaksiMasuk.id}, ${nominalCents}, ${req.tanggal_transaksi})
        `;
        
        // Only deduct from source account
        await akunDB.exec`UPDATE akun SET saldo_terkini = saldo_terkini - ${nominalCents} WHERE id = ${req.akun_asal_id}`;
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

        // Update both account balances
        await akunDB.exec`UPDATE akun SET saldo_terkini = saldo_terkini - ${nominalCents} WHERE id = ${req.akun_asal_id}`;
        await akunDB.exec`UPDATE akun SET saldo_terkini = saldo_terkini + ${nominalCents} WHERE id = ${req.akun_tujuan_id}`;
      }

      await tx.commit();

      // Convert back from cents
      return {
        id: transfer.id,
        transaksi_keluar: {
          ...transaksiKeluar,
          nominal: transaksiKeluar.nominal / 100,
        },
        transaksi_masuk: {
          ...transaksiMasuk,
          nominal: transaksiMasuk.nominal / 100,
        },
        dibuat_pada: transfer.dibuat_pada,
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);
