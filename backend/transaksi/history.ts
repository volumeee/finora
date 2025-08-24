import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { transaksiDB } from "./db";
import { akunDB } from "../akun/db";
import { kategoriDB } from "../kategori/db";
import { tujuanDB } from "../tujuan/db";

interface GetAccountHistoryParams {
  tenant_id: Query<string>;
  akun_id: string;
  limit?: Query<number>;
  offset?: Query<number>;
  jenis?: Query<string>;
  tanggal_dari?: Query<string>;
  tanggal_sampai?: Query<string>;
  search?: Query<string>;
}

interface AccountHistoryResponse {
  akun: {
    id: string;
    nama_akun: string;
    jenis: string;
    saldo_terkini: number;
  };
  transaksi: Array<{
    id: string;
    jenis: string;
    nominal: number;
    saldo_setelah: number;
    tanggal_transaksi: string;
    catatan?: string;
    nama_kategori?: string;
    transfer_info?: {
      type: "masuk" | "keluar";
      paired_account_name?: string;
    };
  }>;
  total: number;
}

export const getAccountHistory = api<GetAccountHistoryParams, AccountHistoryResponse>(
  { expose: true, method: "GET", path: "/history/:akun_id" },
  async ({ tenant_id, akun_id, limit = 50, offset = 0, jenis, tanggal_dari, tanggal_sampai, search }) => {
    // Get account info
    const account = await akunDB.queryRow<{
      id: string;
      nama_akun: string;
      jenis: string;
      saldo_terkini: string;
    }>`
      SELECT id, nama_akun, jenis, saldo_terkini::text
      FROM akun
      WHERE id = ${akun_id} AND tenant_id = ${tenant_id} AND dihapus_pada IS NULL
    `;

    if (!account) {
      throw new Error("Akun tidak ditemukan");
    }

    // Build query with filters
    let query = `
      SELECT id, jenis, nominal::text, tanggal_transaksi::text, catatan, kategori_id, dibuat_pada
      FROM transaksi
      WHERE akun_id = $1 AND tenant_id = $2 AND dihapus_pada IS NULL
    `;
    const params: any[] = [akun_id, tenant_id];
    let paramIndex = 3;

    if (jenis) {
      query += ` AND jenis = $${paramIndex++}`;
      params.push(jenis);
    }
    if (tanggal_dari) {
      query += ` AND tanggal_transaksi >= $${paramIndex++}`;
      params.push(tanggal_dari);
    }
    if (tanggal_sampai) {
      query += ` AND tanggal_transaksi <= $${paramIndex++}`;
      params.push(tanggal_sampai);
    }
    if (search) {
      query += ` AND (catatan ILIKE $${paramIndex++} OR nominal::text ILIKE $${paramIndex++})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY tanggal_transaksi DESC, dibuat_pada DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const transactions = await transaksiDB.rawQueryAll<{
      id: string;
      jenis: string;
      nominal: string;
      tanggal_transaksi: string;
      catatan?: string;
      kategori_id?: string;
      dibuat_pada: string;
    }>(query, ...params);

    // Get transfer info
    const transferIds = transactions.filter(t => t.jenis === 'transfer').map(t => t.id);
    const transferMap = new Map();
    const pairedAccountNames = new Map();
    
    // Check for goal transfers (kontribusi_tujuan)
    const goalTransfers = new Map();
    if (transferIds.length > 0) {
      const contributions = await tujuanDB.queryAll<{
        transaksi_id: string;
        tujuan_tabungan_id: string;
      }>`
        SELECT transaksi_id, tujuan_tabungan_id 
        FROM kontribusi_tujuan 
        WHERE transaksi_id = ANY(${transferIds})
      `;
      
      contributions.forEach(c => {
        goalTransfers.set(c.transaksi_id, c.tujuan_tabungan_id);
      });
    }

    if (transferIds.length > 0) {
      const transfers = await transaksiDB.queryAll<{
        id: string;
        transaksi_keluar_id: string;
        transaksi_masuk_id: string;
      }>`
        SELECT id, transaksi_keluar_id, transaksi_masuk_id
        FROM transfer_antar_akun
        WHERE transaksi_keluar_id = ANY(${transferIds}) OR transaksi_masuk_id = ANY(${transferIds})
      `;

      transfers.forEach(t => {
        transferMap.set(t.transaksi_keluar_id, { type: 'keluar', pairedId: t.transaksi_masuk_id });
        transferMap.set(t.transaksi_masuk_id, { type: 'masuk', pairedId: t.transaksi_keluar_id });
      });

      // Get paired account names
      const pairedIds = Array.from(transferMap.values()).map(info => info.pairedId);
      if (pairedIds.length > 0) {
        const pairedTransactions = await transaksiDB.queryAll<{
          id: string;
          akun_id: string;
        }>`
          SELECT id, akun_id FROM transaksi WHERE id = ANY(${pairedIds})
        `;

        const accountIds = pairedTransactions.map(t => t.akun_id);
        const accounts = await akunDB.queryAll<{id: string, nama_akun: string}>`
          SELECT id, nama_akun FROM akun WHERE id = ANY(${accountIds}) AND dihapus_pada IS NULL
        `;
        
        const goals = await tujuanDB.queryAll<{id: string, nama_tujuan: string}>`
          SELECT id, nama_tujuan FROM tujuan_tabungan WHERE id = ANY(${accountIds}) AND dihapus_pada IS NULL
        `;

        accounts.forEach(a => pairedAccountNames.set(a.id, a.nama_akun));
        goals.forEach(g => pairedAccountNames.set(g.id, `🎯 ${g.nama_tujuan}`));

        pairedTransactions.forEach(pt => {
          const pairedAccountName = pairedAccountNames.get(pt.akun_id);
          transferMap.forEach((info, transactionId) => {
            if (info.pairedId === pt.id) {
              transferMap.set(transactionId, {
                ...info,
                pairedAccountName
              });
            }
          });
        });
      }
      
    }
    
    // Get goal names for direct goal transfers
    if (goalTransfers.size > 0) {
      const goalIds = Array.from(goalTransfers.values());
      const goalNames = await tujuanDB.queryAll<{id: string, nama_tujuan: string}>`
        SELECT id, nama_tujuan FROM tujuan_tabungan WHERE id = ANY(${goalIds}) AND dihapus_pada IS NULL
      `;
      goalNames.forEach(g => pairedAccountNames.set(g.id, `🎯 ${g.nama_tujuan}`));
    }

    // Get category names
    const categoryIds = transactions.map(t => t.kategori_id).filter(Boolean);
    const categoryNames = new Map();
    if (categoryIds.length > 0) {
      const categories = await kategoriDB.queryAll<{id: string, nama_kategori: string}>`
        SELECT id, nama_kategori FROM kategori WHERE id = ANY(${categoryIds}) AND dihapus_pada IS NULL
      `;
      categories.forEach(c => categoryNames.set(c.id, c.nama_kategori));
    }

    // Calculate running balance correctly
    const formattedTransactions = transactions.map(t => {
      const nominal = parseInt(t.nominal) / 100;
      const transferInfo = transferMap.get(t.id);
      const goalId = goalTransfers.get(t.id);
      
      const transaction: any = {
        id: t.id,
        jenis: t.jenis,
        nominal,
        saldo_setelah: 0,
        tanggal_transaksi: t.tanggal_transaksi,
        catatan: t.catatan,
        nama_kategori: categoryNames.get(t.kategori_id)
      };

      if (t.jenis === 'transfer') {
        if (transferInfo) {
          transaction.transfer_info = {
            type: transferInfo.type,
            paired_account_name: transferInfo.pairedAccountName
          };
        } else if (goalId) {
          transaction.transfer_info = {
            type: 'keluar',
            paired_account_name: pairedAccountNames.get(goalId)
          };
        } else {
          transaction.transfer_info = {
            type: 'keluar',
            paired_account_name: undefined
          };
        }
      }

      return transaction;
    });

    // Calculate saldo_setelah from newest to oldest
    let currentBalance = parseInt(account.saldo_terkini);
    formattedTransactions.forEach(t => {
      const isCredit = t.jenis === 'pemasukan' || (t.jenis === 'transfer' && t.transfer_info?.type === 'masuk');
      
      // Set saldo after this transaction (before going to previous transaction)
      t.saldo_setelah = currentBalance / 100;
      
      // Then subtract/add to get balance before this transaction
      if (isCredit) {
        currentBalance -= Math.round(t.nominal * 100);
      } else {
        currentBalance += Math.round(t.nominal * 100);
      }
    });

    // Get total count with same filters
    let countQuery = `
      SELECT COUNT(*)::text as count
      FROM transaksi
      WHERE akun_id = $1 AND tenant_id = $2 AND dihapus_pada IS NULL
    `;
    const countParams: any[] = [akun_id, tenant_id];
    let countParamIndex = 3;

    if (jenis) {
      countQuery += ` AND jenis = $${countParamIndex++}`;
      countParams.push(jenis);
    }
    if (tanggal_dari) {
      countQuery += ` AND tanggal_transaksi >= $${countParamIndex++}`;
      countParams.push(tanggal_dari);
    }
    if (tanggal_sampai) {
      countQuery += ` AND tanggal_transaksi <= $${countParamIndex++}`;
      countParams.push(tanggal_sampai);
    }
    if (search) {
      countQuery += ` AND (catatan ILIKE $${countParamIndex++} OR nominal::text ILIKE $${countParamIndex++})`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const totalResult = await transaksiDB.rawQueryRow<{count: string}>(countQuery, ...countParams);

    return {
      akun: {
        id: account.id,
        nama_akun: account.nama_akun,
        jenis: account.jenis,
        saldo_terkini: parseInt(account.saldo_terkini) / 100
      },
      transaksi: formattedTransactions,
      total: parseInt(totalResult?.count || '0')
    };
  }
);