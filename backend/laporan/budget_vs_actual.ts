import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const laporanDB = SQLDatabase.named("transaksi");

export interface BudgetVsActualItem {
  kategori_id: string;
  nama_kategori: string;
  budget: number;
  actual: number;
  variance: number;
  variance_persen: number;
  status: "over" | "under" | "on_track";
}

export interface LaporanBudgetVsActualResponse {
  periode: {
    tahun: number;
    bulan: number;
  };
  ringkasan: {
    total_budget: number;
    total_actual: number;
    total_variance: number;
    kategori_over_budget: number;
    kategori_under_budget: number;
  };
  detail_kategori: BudgetVsActualItem[];
}

interface LaporanBudgetVsActualParams {
  tenant_id: Query<string>;
  tahun: Query<number>;
  bulan: Query<number>;
}

// Generates budget vs actual report for a specific month.
export const laporanBudgetVsActual = api<LaporanBudgetVsActualParams, LaporanBudgetVsActualResponse>(
  { expose: true, method: "GET", path: "/laporan/budget-vs-actual" },
  async ({ tenant_id, tahun, bulan }) => {
    // Get budget data for the month
    const budgetQuery = `
      SELECT 
        ab.kategori_id,
        k.nama_kategori,
        ab.nominal_budget as budget,
        COALESCE(SUM(t.nominal), 0) as actual
      FROM anggaran_bulanan ab
      LEFT JOIN kategori k ON ab.kategori_id = k.id
      LEFT JOIN transaksi t ON t.kategori_id = ab.kategori_id 
        AND t.tenant_id = ab.tenant_id 
        AND t.jenis = 'pengeluaran'
        AND t.dihapus_pada IS NULL
        AND EXTRACT(YEAR FROM t.tanggal_transaksi) = ab.tahun
        AND EXTRACT(MONTH FROM t.tanggal_transaksi) = ab.bulan
      WHERE ab.tenant_id = $1 AND ab.tahun = $2 AND ab.bulan = $3
      GROUP BY ab.kategori_id, k.nama_kategori, ab.nominal_budget
      ORDER BY ab.nominal_budget DESC
    `;
    
    const rawBudgetData = await laporanDB.rawQueryAll<{
      kategori_id: string;
      nama_kategori: string;
      budget: number;
      actual: number;
    }>(budgetQuery, tenant_id, tahun, bulan);
    
    let totalBudget = 0;
    let totalActual = 0;
    let kategoriOverBudget = 0;
    let kategoriUnderBudget = 0;
    
    const detailKategori: BudgetVsActualItem[] = rawBudgetData.map(rawItem => {
      // Convert from cents
      const item = {
        ...rawItem,
        budget: rawItem.budget / 100,
        actual: rawItem.actual / 100
      };
      const variance = item.actual - item.budget;
      const variancePersen = item.budget > 0 ? (variance / item.budget) * 100 : 0;
      
      let status: "over" | "under" | "on_track" = "on_track";
      if (variance > item.budget * 0.05) { // 5% tolerance
        status = "over";
        kategoriOverBudget++;
      } else if (variance < -item.budget * 0.05) {
        status = "under";
        kategoriUnderBudget++;
      }
      
      totalBudget += item.budget;
      totalActual += item.actual;
      
      return {
        kategori_id: item.kategori_id,
        nama_kategori: item.nama_kategori,
        budget: item.budget,
        actual: item.actual,
        variance,
        variance_persen: variancePersen,
        status
      };
    });
    
    const totalVariance = totalActual - totalBudget;
    
    return {
      periode: {
        tahun,
        bulan
      },
      ringkasan: {
        total_budget: totalBudget,
        total_actual: totalActual,
        total_variance: totalVariance,
        kategori_over_budget: kategoriOverBudget,
        kategori_under_budget: kategoriUnderBudget
      },
      detail_kategori: detailKategori
    };
  }
);
