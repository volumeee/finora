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

    query += ` ORDER BY tanggal_transaksi DESC, dibuat_pada DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    // hasil query sekarang bertipe string, bukan bigint
    const rows = await transaksiDB.rawQueryAll<{
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
    }>(query, ...params);

    // konversi ke tipe yang diinginkan
    const transaksi: Transaksi[] = rows.map((r) => ({
      ...r,
      nominal: parseInt(r.nominal, 10) / 100,
    }));

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
