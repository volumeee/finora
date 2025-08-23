import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { transaksiDB } from "./db";
import { Transaksi, SplitKategori } from "./create";

interface ListTransaksiParams {
  tenant_id: Query<string>;
  akun_id?: Query<string>;
  kategori_id?: Query<string>;
  jenis?: Query<string>;
  tanggal_dari?: Query<string>;
  tanggal_sampai?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

interface ListTransaksiResponse {
  transaksi: Transaksi[];
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
        nominal::text      AS nominal,
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

    // Add missing paired transactions
    let filteredRows = rows;
    
    if (transferIds.length > 0) {
      const pairedIds = Array.from(transferMap.values()).map(info => info.pairedId).filter(Boolean);
      const existingIds = new Set(rows.map(r => r.id));
      const missingIds = pairedIds.filter(id => !existingIds.has(id));
      
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
        
        filteredRows = [...rows, ...missingTransactions];
        
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
    if (transferIds.length > 0) {
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
        WHERE (ta.transaksi_keluar_id = ANY(${transferIds}) OR ta.transaksi_masuk_id = ANY(${transferIds}))
        AND t1.dihapus_pada IS NULL AND t2.dihapus_pada IS NULL
      `;
      
      allTransferRelations.forEach(rel => {
        pairedAccounts.set(rel.keluar_id, rel.masuk_akun);
        pairedAccounts.set(rel.masuk_id, rel.keluar_akun);
      });
    }

    // Convert and add transfer metadata
    const transaksi: Transaksi[] = filteredRows.map((r) => {
      const transaction = {
        ...r,
        nominal: parseInt(r.nominal, 10) / 100,
      };
      
      if (r.jenis === 'transfer') {
        const transferInfo = transferMap.get(r.id);
        if (transferInfo) {
          const pairedAccountId = pairedAccounts.get(r.id);
          (transaction as any).transfer_info = {
            paired_transaction_id: transferInfo.pairedId,
            transfer_id: transferInfo.transferId,
            type: transferInfo.type,
            paired_account_id: pairedAccounts.get(r.id)
          };
        }
      }
      
      return transaction;
    });

    // split kategori
    for (const t of transaksi) {
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
