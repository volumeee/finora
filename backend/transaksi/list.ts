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
  async ({ tenant_id, akun_id, kategori_id, jenis, tanggal_dari, tanggal_sampai, limit = 50, offset = 0 }) => {
    let query = `
      SELECT id, tenant_id, akun_id, kategori_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id, transaksi_berulang_id, dibuat_pada, diubah_pada
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
    
    query += ` ORDER BY tanggal_transaksi DESC, dibuat_pada DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);
    
    const transaksi = await transaksiDB.rawQueryAll<Transaksi>(query, ...params);
    
    // Get all split categories in one query to avoid N+1 problem
    const transactionIds = transaksi.map(t => t.id);
    let allSplits: (SplitKategori & { transaksi_id: string })[] = [];
    
    if (transactionIds.length > 0) {
      allSplits = await transaksiDB.rawQueryAll<SplitKategori & { transaksi_id: string }>(
        `SELECT transaksi_id, kategori_id, nominal_split 
         FROM detail_transaksi_split 
         WHERE transaksi_id = ANY($1)`,
        [transactionIds]
      );
    }
    
    // Group splits by transaction ID and convert from cents
    const splitsByTransaction = allSplits.reduce((acc, split) => {
      if (!acc[split.transaksi_id]) {
        acc[split.transaksi_id] = [];
      }
      acc[split.transaksi_id].push({
        kategori_id: split.kategori_id,
        nominal_split: Number(split.nominal_split) / 100
      });
      return acc;
    }, {} as Record<string, SplitKategori[]>);
    
    // Assign splits to transactions and convert nominal from cents
    for (const t of transaksi) {
      if (splitsByTransaction[t.id]) {
        t.split_kategori = splitsByTransaction[t.id];
      }
      // Convert nominal from cents
      t.nominal = Number(t.nominal) / 100;
    }
    
    // Count total
    let countQuery = `
      SELECT COUNT(*) as count
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
    
    const countRow = await transaksiDB.rawQueryRow<{ count: number }>(countQuery, ...countParams);
    
    return {
      transaksi,
      total: countRow?.count || 0
    };
  }
);
