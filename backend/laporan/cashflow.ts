import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const laporanDB = SQLDatabase.named("transaksi");

export interface CashflowItem {
  tanggal: string;
  pemasukan: number;
  pengeluaran: number;
  saldo_berjalan: number;
  kategori_terbesar?: string;
  nominal_kategori_terbesar?: number;
}

export interface LaporanCashflowResponse {
  periode: {
    dari: string;
    sampai: string;
  };
  ringkasan: {
    total_pemasukan: number;
    total_pengeluaran: number;
    net_cashflow: number;
    rata_rata_harian: number;
  };
  data_harian: CashflowItem[];
  kategori_teratas: {
    nama_kategori: string;
    total_nominal: number;
    persentase: number;
  }[];
}

interface LaporanCashflowParams {
  tenant_id: Query<string>;
  tanggal_dari: Query<string>;
  tanggal_sampai: Query<string>;
  akun_id?: Query<string>;
}

// Generates cashflow report for a specific period.
export const laporanCashflow = api<LaporanCashflowParams, LaporanCashflowResponse>(
  { expose: true, method: "GET", path: "/laporan/cashflow" },
  async ({ tenant_id, tanggal_dari, tanggal_sampai, akun_id }) => {
    let whereClause = `WHERE t.tenant_id = $1 AND t.dihapus_pada IS NULL AND t.tanggal_transaksi BETWEEN $2 AND $3`;
    const params: any[] = [tenant_id, tanggal_dari, tanggal_sampai];
    let paramIndex = 4;
    
    if (akun_id) {
      whereClause += ` AND t.akun_id = $${paramIndex++}`;
      params.push(akun_id);
    }
    
    // Get daily cashflow data
    const dailyQuery = `
      SELECT 
        t.tanggal_transaksi::text as tanggal,
        COALESCE(SUM(CASE WHEN t.jenis = 'pemasukan' THEN t.nominal ELSE 0 END), 0) as pemasukan,
        COALESCE(SUM(CASE WHEN t.jenis = 'pengeluaran' THEN t.nominal ELSE 0 END), 0) as pengeluaran
      FROM transaksi t
      ${whereClause}
      GROUP BY t.tanggal_transaksi
      ORDER BY t.tanggal_transaksi
    `;
    
    const dailyData = await laporanDB.rawQueryAll<{
      tanggal: string;
      pemasukan: number;
      pengeluaran: number;
    }>(dailyQuery, ...params);
    
    // Calculate running balance and format data
    let saldoBerjalan = 0;
    const dataHarian: CashflowItem[] = dailyData.map(item => {
      saldoBerjalan += item.pemasukan - item.pengeluaran;
      return {
        tanggal: item.tanggal,
        pemasukan: item.pemasukan,
        pengeluaran: item.pengeluaran,
        saldo_berjalan: saldoBerjalan
      };
    });
    
    // Get summary data
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN t.jenis = 'pemasukan' THEN t.nominal ELSE 0 END), 0) as total_pemasukan,
        COALESCE(SUM(CASE WHEN t.jenis = 'pengeluaran' THEN t.nominal ELSE 0 END), 0) as total_pengeluaran
      FROM transaksi t
      ${whereClause}
    `;
    
    const summary = await laporanDB.rawQueryRow<{
      total_pemasukan: number;
      total_pengeluaran: number;
    }>(summaryQuery, ...params);
    
    const totalPemasukan = summary?.total_pemasukan || 0;
    const totalPengeluaran = summary?.total_pengeluaran || 0;
    const netCashflow = totalPemasukan - totalPengeluaran;
    const daysDiff = Math.ceil((new Date(tanggal_sampai).getTime() - new Date(tanggal_dari).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const rataRataHarian = netCashflow / daysDiff;
    
    // Get top categories
    const categoryQuery = `
      SELECT 
        COALESCE(k.nama_kategori, 'Tanpa Kategori') as nama_kategori,
        SUM(t.nominal) as total_nominal
      FROM transaksi t
      LEFT JOIN kategori k ON t.kategori_id = k.id
      ${whereClause} AND t.jenis = 'pengeluaran'
      GROUP BY k.nama_kategori
      ORDER BY total_nominal DESC
      LIMIT 5
    `;
    
    const topCategories = await laporanDB.rawQueryAll<{
      nama_kategori: string;
      total_nominal: number;
    }>(categoryQuery, ...params);
    
    const kategoriTeratas = topCategories.map(cat => ({
      nama_kategori: cat.nama_kategori,
      total_nominal: cat.total_nominal,
      persentase: totalPengeluaran > 0 ? (cat.total_nominal / totalPengeluaran) * 100 : 0
    }));
    
    return {
      periode: {
        dari: tanggal_dari,
        sampai: tanggal_sampai
      },
      ringkasan: {
        total_pemasukan: totalPemasukan,
        total_pengeluaran: totalPengeluaran,
        net_cashflow: netCashflow,
        rata_rata_harian: rataRataHarian
      },
      data_harian: dataHarian,
      kategori_teratas: kategoriTeratas
    };
  }
);
