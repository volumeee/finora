import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { tujuanDB } from "./db";
import { TujuanTabungan } from "./create";

interface ListTujuanParams {
  tenant_id: Query<string>;
  jenis_tujuan?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

interface ListTujuanResponse {
  tujuan: TujuanTabungan[];
  total: number;
}

// Retrieves all savings goals for a tenant.
export const list = api<ListTujuanParams, ListTujuanResponse>(
  { expose: true, method: "GET", path: "/tujuan" },
  async ({ tenant_id, jenis_tujuan, limit = 50, offset = 0 }) => {
    let query = `
      SELECT id, tenant_id, nama_tujuan, jenis_tujuan, target_nominal, nominal_terkumpul, tenggat_tanggal, catatan, dibuat_pada, diubah_pada
      FROM tujuan_tabungan
      WHERE tenant_id = $1 AND dihapus_pada IS NULL
    `;
    
    const params: any[] = [tenant_id];
    let paramIndex = 2;
    
    if (jenis_tujuan) {
      query += ` AND jenis_tujuan = $${paramIndex++}`;
      params.push(jenis_tujuan);
    }
    
    query += ` ORDER BY dibuat_pada DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);
    
    const tujuan = await tujuanDB.rawQueryAll<TujuanTabungan>(query, ...params);
    
    let countQuery = `
      SELECT COUNT(*) as count
      FROM tujuan_tabungan
      WHERE tenant_id = $1 AND dihapus_pada IS NULL
    `;
    
    const countParams: any[] = [tenant_id];
    if (jenis_tujuan) {
      countQuery += ` AND jenis_tujuan = $2`;
      countParams.push(jenis_tujuan);
    }
    
    const countRow = await tujuanDB.rawQueryRow<{ count: number }>(countQuery, ...countParams);
    
    return {
      tujuan,
      total: countRow?.count || 0
    };
  }
);
