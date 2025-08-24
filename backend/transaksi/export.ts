import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { transaksiDB } from "./db";
import { akunDB } from "../akun/db";
import { kategoriDB } from "../kategori/db";

interface ExportTransaksiParams {
  tenant_id: Query<string>;
  akun_id?: Query<string>;
  jenis?: Query<string>;
  tanggal_dari?: Query<string>;
  tanggal_sampai?: Query<string>;
  format?: Query<"csv" | "json">;
}

interface ExportResponse {
  data: string;
  filename: string;
  contentType: string;
}

export const exportTransaksi = api<ExportTransaksiParams, ExportResponse>(
  { expose: true, method: "GET", path: "/transaksi/export" },
  async ({ tenant_id, akun_id, jenis, tanggal_dari, tanggal_sampai, format = "csv" }) => {
    let query = `
      SELECT 
        t.id,
        t.jenis,
        t.nominal::text,
        t.mata_uang,
        t.tanggal_transaksi::text,
        t.catatan,
        a.nama_akun,
        k.nama_kategori,
        t.dibuat_pada
      FROM transaksi t
      LEFT JOIN akun a ON t.akun_id = a.id
      LEFT JOIN kategori k ON t.kategori_id = k.id
      WHERE t.tenant_id = $1 AND t.dihapus_pada IS NULL
    `;

    const params: any[] = [tenant_id];
    let paramIndex = 2;

    if (akun_id) {
      query += ` AND t.akun_id = $${paramIndex++}`;
      params.push(akun_id);
    }
    if (jenis) {
      query += ` AND t.jenis = $${paramIndex++}`;
      params.push(jenis);
    }
    if (tanggal_dari) {
      query += ` AND t.tanggal_transaksi >= $${paramIndex++}`;
      params.push(tanggal_dari);
    }
    if (tanggal_sampai) {
      query += ` AND t.tanggal_transaksi <= $${paramIndex++}`;
      params.push(tanggal_sampai);
    }

    query += ` ORDER BY t.tanggal_transaksi DESC, t.dibuat_pada DESC`;

    const rows = await transaksiDB.rawQueryAll<{
      id: string;
      jenis: string;
      nominal: string;
      mata_uang: string;
      tanggal_transaksi: string;
      catatan?: string;
      nama_akun?: string;
      nama_kategori?: string;
      dibuat_pada: string;
    }>(query, ...params);

    const data = rows.map(r => ({
      ...r,
      nominal: (parseInt(r.nominal) / 100).toLocaleString('id-ID')
    }));

    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === "json") {
      return {
        data: JSON.stringify(data, null, 2),
        filename: `transaksi_${timestamp}.json`,
        contentType: "application/json"
      };
    }

    // CSV format
    const headers = ["Tanggal", "Jenis", "Akun", "Kategori", "Nominal", "Mata Uang", "Catatan"];
    const csvRows = [
      headers.join(","),
      ...data.map(row => [
        row.tanggal_transaksi,
        row.jenis,
        row.nama_akun || "",
        row.nama_kategori || "",
        row.nominal,
        row.mata_uang,
        (row.catatan || "").replace(/,/g, ";")
      ].join(","))
    ];

    return {
      data: csvRows.join("\n"),
      filename: `transaksi_${timestamp}.csv`,
      contentType: "text/csv"
    };
  }
);

interface ExportAccountHistoryParams {
  tenant_id: Query<string>;
  akun_id: Query<string>;
  jenis?: Query<string>;
  tanggal_dari?: Query<string>;
  tanggal_sampai?: Query<string>;
  format?: Query<"csv" | "json">;
}

export const exportAccountHistory = api<ExportAccountHistoryParams, ExportResponse>(
  { expose: true, method: "GET", path: "/history/export" },
  async ({ tenant_id, akun_id, jenis, tanggal_dari, tanggal_sampai, format = "csv" }) => {
    if (!akun_id) throw new Error("akun_id is required");

    let query = `
      SELECT 
        t.id,
        t.jenis,
        t.nominal::text,
        t.mata_uang,
        t.tanggal_transaksi::text,
        t.catatan,
        a.nama_akun,
        k.nama_kategori,
        t.dibuat_pada
      FROM transaksi t
      LEFT JOIN akun a ON t.akun_id = a.id
      LEFT JOIN kategori k ON t.kategori_id = k.id
      WHERE t.akun_id = $1 AND t.tenant_id = $2 AND t.dihapus_pada IS NULL
    `;

    const params: any[] = [akun_id, tenant_id];
    let paramIndex = 3;

    if (jenis) {
      query += ` AND t.jenis = $${paramIndex++}`;
      params.push(jenis);
    }
    if (tanggal_dari) {
      query += ` AND t.tanggal_transaksi >= $${paramIndex++}`;
      params.push(tanggal_dari);
    }
    if (tanggal_sampai) {
      query += ` AND t.tanggal_transaksi <= $${paramIndex++}`;
      params.push(tanggal_sampai);
    }

    query += ` ORDER BY t.tanggal_transaksi DESC, t.dibuat_pada DESC`;

    const rows = await transaksiDB.rawQueryAll<{
      id: string;
      jenis: string;
      nominal: string;
      mata_uang: string;
      tanggal_transaksi: string;
      catatan?: string;
      nama_akun?: string;
      nama_kategori?: string;
      dibuat_pada: string;
    }>(query, ...params);

    const data = rows.map(r => ({
      ...r,
      nominal: (parseInt(r.nominal) / 100).toLocaleString('id-ID')
    }));

    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === "json") {
      return {
        data: JSON.stringify(data, null, 2),
        filename: `mutasi_${akun_id}_${timestamp}.json`,
        contentType: "application/json"
      };
    }

    // CSV format
    const headers = ["Tanggal", "Jenis", "Akun", "Kategori", "Nominal", "Mata Uang", "Catatan"];
    const csvRows = [
      headers.join(","),
      ...data.map(row => [
        row.tanggal_transaksi,
        row.jenis,
        row.nama_akun || "",
        row.nama_kategori || "",
        row.nominal,
        row.mata_uang,
        (row.catatan || "").replace(/,/g, ";")
      ].join(","))
    ];

    return {
      data: csvRows.join("\n"),
      filename: `mutasi_${akun_id}_${timestamp}.csv`,
      contentType: "text/csv"
    };
  }
);