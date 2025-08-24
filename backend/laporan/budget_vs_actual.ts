import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const transaksiDB = SQLDatabase.named("transaksi");
const kategoriDB = SQLDatabase.named("kategori");

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
    // Get actual spending for each category (since budget table doesn't exist)
    const actualQuery = `
      SELECT 
        kategori_id,
        COALESCE(SUM(nominal), 0)::bigint as actual
      FROM transaksi
      WHERE tenant_id = $1 
        AND jenis = 'pengeluaran'
        AND dihapus_pada IS NULL
        AND EXTRACT(YEAR FROM tanggal_transaksi)::bigint = $2::bigint
        AND EXTRACT(MONTH FROM tanggal_transaksi)::bigint = $3::bigint
        AND kategori_id IS NOT NULL
      GROUP BY kategori_id
      ORDER BY actual DESC
    `;
    
    const rawActuals = await transaksiDB.rawQueryAll<{
      kategori_id: string;
      actual: bigint;
    }>(actualQuery, tenant_id, tahun, bulan);
    
    // Get category names
    const categoryIds = rawActuals.map(a => a.kategori_id).filter(Boolean);
    const categoryNames = new Map();
    
    if (categoryIds.length > 0) {
      const categories = await kategoriDB.queryAll<{id: string, nama_kategori: string}>`
        SELECT id, nama_kategori FROM kategori WHERE id = ANY(${categoryIds})
      `;
      categories.forEach(c => categoryNames.set(c.id, c.nama_kategori));
    }
    
    // Create budget data based on previous month average or set default budget
    const prevMonthQuery = `
      SELECT 
        kategori_id,
        COALESCE(AVG(nominal), 0)::bigint as avg_spending
      FROM transaksi
      WHERE tenant_id = $1 
        AND jenis = 'pengeluaran'
        AND dihapus_pada IS NULL
        AND EXTRACT(YEAR FROM tanggal_transaksi)::bigint = $2::bigint
        AND EXTRACT(MONTH FROM tanggal_transaksi)::bigint = $3::bigint
        AND kategori_id IS NOT NULL
      GROUP BY kategori_id
    `;
    
    const prevMonth = bulan === 1 ? 12 : bulan - 1;
    const prevYear = bulan === 1 ? tahun - 1 : tahun;
    
    const rawPrevMonth = await transaksiDB.rawQueryAll<{
      kategori_id: string;
      avg_spending: bigint;
    }>(prevMonthQuery, tenant_id, prevYear, prevMonth);
    
    const budgetMap = new Map(rawPrevMonth.map(p => [p.kategori_id, Number(p.avg_spending) * 1.1])); // 10% increase as budget
    
    const rawBudgetData = rawActuals.map(actual => {
      const actualAmount = Number(actual.actual);
      const budgetAmount = budgetMap.get(actual.kategori_id) || actualAmount * 1.2; // Default 20% more than actual
      
      return {
        kategori_id: actual.kategori_id,
        nama_kategori: categoryNames.get(actual.kategori_id) || 'Kategori Tidak Diketahui',
        budget: budgetAmount,
        actual: actualAmount
      };
    });
    
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
