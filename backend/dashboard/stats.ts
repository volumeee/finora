import { api } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const akunDB = SQLDatabase.named("akun");
const transaksiDB = SQLDatabase.named("transaksi");
const tujuanDB = SQLDatabase.named("tujuan");

export interface DashboardStatsRequest {
  tenant_id: string;
}

export interface DashboardStatsResponse {
  total_balance: number;
  monthly_income: number;
  monthly_expense: number;
  accounts_count: number;
  goals_count: number;
  completed_goals: number;
  recent_transactions: Array<{
    id: string;
    jenis: string;
    nominal: number;
    catatan?: string;
    tanggal_transaksi: string;
  }>;
}

// Gets dashboard statistics for a tenant.
export const getStats = api<DashboardStatsRequest, DashboardStatsResponse>(
  { expose: true, method: "GET", path: "/dashboard/stats" },
  async (req) => {
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // Get total balance from all accounts  
    const balanceResult = await akunDB.queryRow<{ total_balance: string }>`
      SELECT COALESCE(SUM(saldo_terkini), 0)::text as total_balance
      FROM akun
      WHERE tenant_id = ${req.tenant_id} AND dihapus_pada IS NULL
    `;

    // Get monthly income and expense
    const incomeResult = await transaksiDB.queryRow<{ monthly_income: string }>`
      SELECT COALESCE(SUM(nominal), 0)::text as monthly_income
      FROM transaksi
      WHERE tenant_id = ${req.tenant_id} 
        AND jenis = 'pemasukan'
        AND tanggal_transaksi >= ${firstDayOfMonth.toISOString().split('T')[0]}
        AND tanggal_transaksi <= ${lastDayOfMonth.toISOString().split('T')[0]}
        AND dihapus_pada IS NULL
    `;

    const expenseResult = await transaksiDB.queryRow<{ monthly_expense: string }>`
      SELECT COALESCE(SUM(nominal), 0)::text as monthly_expense
      FROM transaksi
      WHERE tenant_id = ${req.tenant_id} 
        AND jenis = 'pengeluaran'
        AND tanggal_transaksi >= ${firstDayOfMonth.toISOString().split('T')[0]}
        AND tanggal_transaksi <= ${lastDayOfMonth.toISOString().split('T')[0]}
        AND dihapus_pada IS NULL
    `;

    // Get accounts count
    const accountsResult = await akunDB.queryRow<{ accounts_count: number }>`
      SELECT COUNT(*) as accounts_count
      FROM akun
      WHERE tenant_id = ${req.tenant_id} AND dihapus_pada IS NULL
    `;

    // Get goals count and completed goals
    const goalsResult = await tujuanDB.queryRow<{ goals_count: number; completed_goals: number }>`
      SELECT 
        COUNT(*) as goals_count,
        COUNT(CASE WHEN nominal_terkumpul >= target_nominal THEN 1 END) as completed_goals
      FROM tujuan_tabungan
      WHERE tenant_id = ${req.tenant_id} AND dihapus_pada IS NULL
    `;

    // Get recent transactions
    const rawTransactions = await transaksiDB.queryAll<{
      id: string;
      jenis: string;
      nominal: string;
      catatan?: string;
      tanggal_transaksi: string;
    }>`
      SELECT 
        id,
        jenis,
        nominal::text,
        catatan,
        tanggal_transaksi::text
      FROM transaksi
      WHERE tenant_id = ${req.tenant_id} 
        AND dihapus_pada IS NULL
        AND tanggal_transaksi >= ${firstDayOfMonth.toISOString().split('T')[0]}
        AND tanggal_transaksi <= ${lastDayOfMonth.toISOString().split('T')[0]}
      ORDER BY tanggal_transaksi DESC
      LIMIT 5
    `;
    
    // Convert from cents
    const recentTransactions = rawTransactions.map(t => ({
      ...t,
      nominal: parseInt(t.nominal) / 100
    }));

    return {
      total_balance: parseInt(balanceResult?.total_balance || '0') / 100,
      monthly_income: parseInt(incomeResult?.monthly_income || '0') / 100,
      monthly_expense: parseInt(expenseResult?.monthly_expense || '0') / 100,
      accounts_count: accountsResult?.accounts_count || 0,
      goals_count: goalsResult?.goals_count || 0,
      completed_goals: goalsResult?.completed_goals || 0,
      recent_transactions: recentTransactions
    };
  }
);