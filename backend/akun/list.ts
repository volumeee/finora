import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { akunDB } from "./db";
import { Akun } from "./create";
import { AkunWithBalance } from "./get";

interface ListAkunParams {
  tenant_id: Query<string>;
  jenis?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

interface ListAkunResponse {
  akun: AkunWithBalance[];
  total: number;
}

// Retrieves all accounts for a tenant.
export const list = api<ListAkunParams, ListAkunResponse>(
  { expose: true, method: "GET", path: "/akun" },
  async ({ tenant_id, jenis, limit = 50, offset = 0 }) => {
    let query = `
      SELECT id, tenant_id, nama_akun, jenis, mata_uang, saldo_awal, saldo_terkini, keterangan, dibuat_pada, diubah_pada
      FROM akun
      WHERE tenant_id = $1 AND dihapus_pada IS NULL
    `;

    const params: any[] = [tenant_id];
    let paramIndex = 2;

    if (jenis) {
      query += ` AND jenis = $${paramIndex++}`;
      params.push(jenis);
    }

    query += ` ORDER BY dibuat_pada DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const rows = await akunDB.rawQueryAll<Akun>(query, ...params);

    // convert saldo dari bigint → normal dan tambahkan info saldo
    const akun = rows.map((row) => {
      const saldo_awal = Number(row.saldo_awal) / 100;
      const saldo_terkini = Number(row.saldo_terkini) / 100;
      
      // Determine balance status
      let status_saldo: 'cukup' | 'rendah' | 'kosong';
      if (saldo_terkini <= 0) {
        status_saldo = 'kosong';
      } else if (saldo_terkini < 100000) { // Less than 100k IDR
        status_saldo = 'rendah';
      } else {
        status_saldo = 'cukup';
      }
      
      return {
        ...row,
        saldo_awal,
        saldo_terkini,
        saldo_tersedia: saldo_terkini,
        status_saldo,
      };
    });

    let countQuery = `
      SELECT COUNT(*) as count
      FROM akun
      WHERE tenant_id = $1 AND dihapus_pada IS NULL
    `;

    const countParams: any[] = [tenant_id];
    if (jenis) {
      countQuery += ` AND jenis = $2`;
      countParams.push(jenis);
    }

    const countRow = await akunDB.rawQueryRow<{ count: number }>(
      countQuery,
      ...countParams
    );

    return {
      akun,
      total: Number(countRow?.count || 0),
    };
  }
);
