import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { transaksiDB } from "./db";
import { akunDB } from "../akun/db";
import { kategoriDB } from "../kategori/db";
import { tujuanDB } from "../tujuan/db";
import { Transaksi, SplitKategori } from "./create";

interface ListTransaksiParams {
  tenant_id: Query<string>;
  akun_id?: Query<string>;
  kategori_id?: Query<string>;
  jenis?: Query<string>;
  tanggal_dari?: Query<string>;
  tanggal_sampai?: Query<string>;
  search?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

interface TransaksiWithDetails extends Transaksi {
  nama_akun?: string;
  nama_kategori?: string;
  nama_tujuan?: string;
  transfer_info?: {
    paired_transaction_id: string;
    transfer_id: string;
    type: "masuk" | "keluar";
    paired_account_id: string;
    paired_account_name?: string;
  };
}

interface ListTransaksiResponse {
  transaksi: TransaksiWithDetails[];
  total: number;
}

// Retrieves all transactions for a tenant with filters.
export const list = api<ListTransaksiParams, ListTransaksiResponse>(
  { expose: true, method: "GET", path: "/transaksi" },
  async ({
    tenant_id,
    akun_id,
    kategori_id,
    jenis,
    tanggal_dari,
    tanggal_sampai,
    search,
    limit = 50,
    offset = 0,
  }) => {
    let query = `
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
      WHERE tenant_id = $1 AND dihapus_pada IS NULL
    `;

    const params: any[] = [tenant_id];
    let paramIndex = 2;

    if (akun_id) {
      query += ` AND akun_id = $${paramIndex++}`;
      params.push(akun_id);
    }

    if (kategori_id) {
      query += ` AND kategori_id = $${paramIndex++}`;
      params.push(kategori_id);
    }

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

    // Get all transactions first, then handle pagination after including transfer pairs
    const tempQuery = query + ` ORDER BY tanggal_transaksi DESC, dibuat_pada DESC`;
    const allRows = await transaksiDB.rawQueryAll<{
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

    }>(tempQuery, ...params);
    
    // Apply pagination after getting transfer pairs
    const rows = allRows.slice(offset, offset + limit);

    // Get transfer relationships
    const transferMap = new Map();
    const transferIds = rows.filter(r => r.jenis === 'transfer').map(r => r.id);
    
    // Check for goal transfers (kontribusi_tujuan) first
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
        transferMap.set(t.transaksi_keluar_id, { transferId: t.id, type: 'keluar', pairedId: t.transaksi_masuk_id });
        transferMap.set(t.transaksi_masuk_id, { transferId: t.id, type: 'masuk', pairedId: t.transaksi_keluar_id });
      });
    }

    // Add missing paired transactions and create them if they don't exist
    let filteredRows = rows;
    
    if (transferIds.length > 0) {
      // For incomplete transfers, create virtual paired transactions
      const incompleteTransfers = rows.filter(r => {
        if (r.jenis === 'transfer') {
          const transferInfo = transferMap.get(r.id);
          return !transferInfo || !transferInfo.pairedId;
        }
        return false;
      });
      
      // Add virtual paired transactions for incomplete transfers
      for (const incomplete of incompleteTransfers) {
        const goalId = goalTransfers.get(incomplete.id);
        if (goalId) {
          // Create virtual incoming transaction for goal
          const virtualTransaction = {
            id: `virtual-${incomplete.id}`,
            tenant_id: incomplete.tenant_id,
            akun_id: goalId,
            kategori_id: null,
            jenis: 'transfer',
            nominal: incomplete.nominal,
            mata_uang: incomplete.mata_uang,
            tanggal_transaksi: incomplete.tanggal_transaksi,
            catatan: 'Kontribusi tujuan tabungan',
            pengguna_id: incomplete.pengguna_id,
            transaksi_berulang_id: null,
            dibuat_pada: incomplete.dibuat_pada,
            diubah_pada: incomplete.diubah_pada
          };
          
          filteredRows.push(virtualTransaction);
          
          // Add to transfer map
          transferMap.set(incomplete.id, { transferId: `virtual-transfer-${incomplete.id}`, type: 'keluar', pairedId: virtualTransaction.id });
          transferMap.set(virtualTransaction.id, { transferId: `virtual-transfer-${incomplete.id}`, type: 'masuk', pairedId: incomplete.id });
        }
      }
      
      // Get existing paired transactions (only real UUIDs)
      const pairedIds = Array.from(transferMap.values()).map(info => info.pairedId).filter(Boolean);
      const existingIds = new Set(rows.map(r => r.id));
      const missingIds = pairedIds.filter(id => !existingIds.has(id) && !id.startsWith('virtual-'));
      
      if (missingIds.length > 0) {
        const missingTransactions = await transaksiDB.rawQueryAll<{
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
        }>(
          `SELECT
            id, tenant_id, akun_id, kategori_id, jenis,
            nominal::text AS nominal, mata_uang,
            tanggal_transaksi::text AS tanggal_transaksi,
            catatan, pengguna_id, transaksi_berulang_id,
            dibuat_pada, diubah_pada
          FROM transaksi
          WHERE id = ANY($1) AND tenant_id = $2 AND dihapus_pada IS NULL`,
          missingIds, tenant_id
        );
        
        filteredRows = [...filteredRows, ...missingTransactions];
        
        // Update transfer map for missing transactions
        missingTransactions.forEach(t => {
          const existingTransfer = Array.from(transferMap.entries())
            .find(([_, info]) => info.pairedId === t.id);
          if (existingTransfer) {
            const [originalId, info] = existingTransfer;
            transferMap.set(t.id, {
              transferId: info.transferId,
              type: info.type === 'keluar' ? 'masuk' : 'keluar',
              pairedId: originalId
            });
          }
        });
      }
    }

    // Get paired account info for all transfers
    const pairedAccounts = new Map();
    const allTransferIds = filteredRows.filter(r => r.jenis === 'transfer').map(r => r.id);
    const realTransferIds = allTransferIds.filter(id => !id.startsWith('virtual-'));

    if (realTransferIds.length > 0) {
      // Get all transfer relationships to properly map accounts
      const allTransferRelations = await transaksiDB.queryAll<{
        transfer_id: string;
        keluar_id: string;
        masuk_id: string;
        keluar_akun: string;
        masuk_akun: string;
      }>`
        SELECT 
          ta.id as transfer_id,
          ta.transaksi_keluar_id as keluar_id,
          ta.transaksi_masuk_id as masuk_id,
          t1.akun_id as keluar_akun,
          t2.akun_id as masuk_akun
        FROM transfer_antar_akun ta
        LEFT JOIN transaksi t1 ON ta.transaksi_keluar_id = t1.id
        LEFT JOIN transaksi t2 ON ta.transaksi_masuk_id = t2.id
        WHERE (ta.transaksi_keluar_id = ANY(${realTransferIds}) OR ta.transaksi_masuk_id = ANY(${realTransferIds}))
        AND t1.dihapus_pada IS NULL AND t2.dihapus_pada IS NULL
      `;
      
      allTransferRelations.forEach(rel => {
        pairedAccounts.set(rel.keluar_id, rel.masuk_akun);
        pairedAccounts.set(rel.masuk_id, rel.keluar_akun);
      });
    }
    
    // Add virtual paired accounts
    filteredRows.forEach(r => {
      if (r.id.startsWith('virtual-')) {
        const originalId = r.id.replace('virtual-', '');
        pairedAccounts.set(originalId, r.akun_id);
        pairedAccounts.set(r.id, filteredRows.find(t => t.id === originalId)?.akun_id);
      }
    });

    // Get account and category names (filter out virtual IDs)
    const accountIds = [...new Set(filteredRows.map(r => r.akun_id).filter(id => id && !id.startsWith('virtual-')))];
    const categoryIds = [...new Set(filteredRows.map(r => r.kategori_id).filter(id => id && !id.startsWith('virtual-')))];
    const pairedAccountIds = [...new Set(Array.from(pairedAccounts.values()).filter(id => id && !id.startsWith('virtual-')))];
    const allAccountIds = [...new Set([...accountIds, ...pairedAccountIds])];

    // Get account names (filter out virtual IDs)
    const accountNames = new Map();
    const validAccountIds = allAccountIds.filter(id => id && !id.startsWith('virtual-'));
    if (validAccountIds.length > 0) {
      const accounts = await akunDB.queryAll<{id: string, nama_akun: string}>`
        SELECT id, nama_akun FROM akun WHERE id = ANY(${validAccountIds}) AND dihapus_pada IS NULL
      `;
      accounts.forEach(a => accountNames.set(a.id, a.nama_akun));
      
      // Also check for goals
      const goals = await tujuanDB.queryAll<{id: string, nama_tujuan: string}>`
        SELECT id, nama_tujuan FROM tujuan_tabungan WHERE id = ANY(${validAccountIds}) AND dihapus_pada IS NULL
      `;
      goals.forEach(g => accountNames.set(g.id, `🎯 ${g.nama_tujuan}`));
    }

    // Get category names (filter out virtual IDs)
    const categoryNames = new Map();
    const validCategoryIds = categoryIds.filter(id => id && !id.startsWith('virtual-'));
    if (validCategoryIds.length > 0) {
      const categories = await kategoriDB.queryAll<{id: string, nama_kategori: string}>`
        SELECT id, nama_kategori FROM kategori WHERE id = ANY(${validCategoryIds}) AND dihapus_pada IS NULL
      `;
      categories.forEach(c => categoryNames.set(c.id, c.nama_kategori));
    }



    // Convert and add transfer metadata
    const transaksi: Transaksi[] = filteredRows.map((r) => {
      const transaction = {
        ...r,
        nominal: parseInt(r.nominal, 10) / 100,
        nama_akun: accountNames.get(r.akun_id),
        nama_kategori: categoryNames.get(r.kategori_id),
      };
      
      if (r.jenis === 'transfer') {
        const transferInfo = transferMap.get(r.id);
        const goalId = goalTransfers.get(r.id);
        
        if (transferInfo) {
          // Regular transfer between accounts
          (transaction as any).transfer_info = {
            paired_transaction_id: transferInfo.pairedId,
            transfer_id: transferInfo.transferId,
            type: transferInfo.type,
            paired_account_id: pairedAccounts.get(r.id),
            paired_account_name: accountNames.get(pairedAccounts.get(r.id))
          };
        } else if (goalId) {
          // Transfer to goal
          (transaction as any).transfer_info = {
            paired_transaction_id: null,
            transfer_id: null,
            type: 'keluar',
            paired_account_id: goalId,
            paired_account_name: accountNames.get(goalId)
          };
        } else {
          // Check if this is a goal transfer
          const goalId = goalTransfers.get(r.id);
          if (goalId) {
            (transaction as any).transfer_info = {
              paired_transaction_id: null,
              transfer_id: null,
              type: 'keluar',
              paired_account_id: goalId,
              paired_account_name: accountNames.get(goalId)
            };
          } else {
            // Unknown transfer - mark as incomplete
            (transaction as any).transfer_info = {
              paired_transaction_id: null,
              transfer_id: null,
              type: 'keluar',
              paired_account_id: null,
              paired_account_name: 'Transfer Tidak Lengkap'
            };
          }
        }
      }
      
      return transaction;
    });

    // split kategori (only for real transactions, not virtual ones)
    for (const t of transaksi) {
      if (!t.id.startsWith('virtual-')) {
        const splits = await transaksiDB.queryAll<{
          kategori_id: string;
          nominal_split: string;
        }>`
          SELECT kategori_id, nominal_split::text AS nominal_split
          FROM detail_transaksi_split
          WHERE transaksi_id = ${t.id}
        `;

        if (splits.length > 0) {
          t.split_kategori = splits.map((s) => ({
            kategori_id: s.kategori_id,
            nominal_split: parseInt(s.nominal_split, 10) / 100,
          }));
        }
      }
    }

    // count total
    let countQuery = `
      SELECT COUNT(*)::text AS count
      FROM transaksi
      WHERE tenant_id = $1 AND dihapus_pada IS NULL
    `;

    const countParams: any[] = [tenant_id];
    let countParamIndex = 2;

    if (akun_id) {
      countQuery += ` AND akun_id = $${countParamIndex++}`;
      countParams.push(akun_id);
    }

    if (kategori_id) {
      countQuery += ` AND kategori_id = $${countParamIndex++}`;
      countParams.push(kategori_id);
    }

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

    const countRow = await transaksiDB.rawQueryRow<{ count: string }>(
      countQuery,
      ...countParams
    );

    return {
      transaksi,
      total: parseInt(countRow?.count || "0", 10),
    };
  }
);
