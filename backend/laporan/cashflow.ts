import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const transaksiDB = SQLDatabase.named("transaksi");
const akunDB = SQLDatabase.named("akun");
const kategoriDB = SQLDatabase.named("kategori");
const tujuanDB = SQLDatabase.named("tujuan");

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
    let whereClause = `WHERE tenant_id = $1 AND dihapus_pada IS NULL AND tanggal_transaksi BETWEEN $2 AND $3`;
    const params: any[] = [tenant_id, tanggal_dari, tanggal_sampai];
    let paramIndex = 4;
    
    if (akun_id) {
      whereClause += ` AND akun_id = $${paramIndex++}`;
      params.push(akun_id);
    }
    
    // Get daily cashflow data
    const dailyQuery = `
      SELECT 
        tanggal_transaksi::text as tanggal,
        COALESCE(SUM(CASE WHEN jenis = 'pemasukan' THEN nominal ELSE 0 END), 0)::bigint as pemasukan,
        COALESCE(SUM(CASE WHEN jenis = 'pengeluaran' THEN nominal ELSE 0 END), 0)::bigint as pengeluaran
      FROM transaksi
      ${whereClause}
      GROUP BY tanggal_transaksi
      ORDER BY tanggal_transaksi
    `;
    
    const rawDailyData = await transaksiDB.rawQueryAll<{
      tanggal: string;
      pemasukan: bigint;
      pengeluaran: bigint;
    }>(dailyQuery, ...params);
    
    // Calculate running balance and format data, convert from cents
    let saldoBerjalan = 0;
    const dataHarian: CashflowItem[] = rawDailyData.map(item => {
      const pemasukan = Number(item.pemasukan) / 100;
      const pengeluaran = Number(item.pengeluaran) / 100;
      saldoBerjalan += pemasukan - pengeluaran;
      return {
        tanggal: item.tanggal,
        pemasukan,
        pengeluaran,
        saldo_berjalan: saldoBerjalan
      };
    });
    
    // Get summary data
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN jenis = 'pemasukan' THEN nominal ELSE 0 END), 0)::bigint as total_pemasukan,
        COALESCE(SUM(CASE WHEN jenis = 'pengeluaran' THEN nominal ELSE 0 END), 0)::bigint as total_pengeluaran
      FROM transaksi
      ${whereClause}
    `;
    
    const rawSummary = await transaksiDB.rawQueryRow<{
      total_pemasukan: bigint;
      total_pengeluaran: bigint;
    }>(summaryQuery, ...params);
    
    // Convert from cents
    const totalPemasukan = Number(rawSummary?.total_pemasukan || 0) / 100;
    const totalPengeluaran = Number(rawSummary?.total_pengeluaran || 0) / 100;
    const netCashflow = totalPemasukan - totalPengeluaran;
    const daysDiff = Math.ceil((new Date(tanggal_sampai).getTime() - new Date(tanggal_dari).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const rataRataHarian = netCashflow / daysDiff;
    
    // Get top categories from separate databases
    const transactionQuery = `
      SELECT 
        kategori_id,
        SUM(nominal)::bigint as total_nominal
      FROM transaksi
      ${whereClause} AND jenis = 'pengeluaran'
      GROUP BY kategori_id
      ORDER BY total_nominal DESC
      LIMIT 5
    `;
    
    const rawTransactions = await transaksiDB.rawQueryAll<{
      kategori_id: string;
      total_nominal: bigint;
    }>(transactionQuery, ...params);
    
    // Get category names
    const categoryIds = rawTransactions.map(t => t.kategori_id).filter(Boolean);
    const categoryNames = new Map();
    
    if (categoryIds.length > 0) {
      const categories = await kategoriDB.queryAll<{id: string, nama_kategori: string}>`
        SELECT id, nama_kategori FROM kategori WHERE id = ANY(${categoryIds})
      `;
      categories.forEach(c => categoryNames.set(c.id, c.nama_kategori));
    }
    
    const rawTopCategories = rawTransactions.map(t => ({
      nama_kategori: categoryNames.get(t.kategori_id) || 'Tanpa Kategori',
      total_nominal: Number(t.total_nominal)
    }));
    
    // Convert from cents and add goal contributions
    const kategoriTeratas = rawTopCategories.map(cat => {
      const totalNominal = cat.total_nominal / 100;
      return {
        nama_kategori: cat.nama_kategori,
        total_nominal: totalNominal,
        persentase: totalPengeluaran > 0 ? (totalNominal / totalPengeluaran) * 100 : 0
      };
    });
    
    // Add goal contributions to cashflow
    const goalContributions = await tujuanDB.queryAll<{nominal_kontribusi: number, tanggal_kontribusi: string}>`
      SELECT kt.nominal_kontribusi, kt.tanggal_kontribusi
      FROM kontribusi_tujuan kt
      LEFT JOIN tujuan_tabungan t ON kt.tujuan_tabungan_id = t.id
      WHERE t.tenant_id = ${tenant_id} 
        AND kt.tanggal_kontribusi BETWEEN ${tanggal_dari} AND ${tanggal_sampai}
    `;
    
    // Add goal contributions to daily data
    goalContributions.forEach(contrib => {
      const existingDay = dataHarian.find(d => d.tanggal === contrib.tanggal_kontribusi);
      const contributionAmount = contrib.nominal_kontribusi / 100;
      
      if (existingDay) {
        existingDay.pengeluaran += contributionAmount;
        existingDay.saldo_berjalan -= contributionAmount;
      } else {
        dataHarian.push({
          tanggal: contrib.tanggal_kontribusi,
          pemasukan: 0,
          pengeluaran: contributionAmount,
          saldo_berjalan: saldoBerjalan - contributionAmount
        });
      }
    });
    
    // Re-sort by date
    dataHarian.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
    
    // Recalculate running balance
    saldoBerjalan = 0;
    dataHarian.forEach(item => {
      saldoBerjalan += item.pemasukan - item.pengeluaran;
      item.saldo_berjalan = saldoBerjalan;
    });
    
    return {
      periode: {
        dari: tanggal_dari,
        sampai: tanggal_sampai
      },
      ringkasan: {
        total_pemasukan: totalPemasukan,
        total_pengeluaran: totalPengeluaran + (goalContributions.reduce((sum, c) => sum + c.nominal_kontribusi, 0) / 100),
        net_cashflow: netCashflow - (goalContributions.reduce((sum, c) => sum + c.nominal_kontribusi, 0) / 100),
        rata_rata_harian: (netCashflow - (goalContributions.reduce((sum, c) => sum + c.nominal_kontribusi, 0) / 100)) / daysDiff
      },
      data_harian: dataHarian,
      kategori_teratas: kategoriTeratas
    };
  }
);
