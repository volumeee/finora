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
    akun_id: string;
    transfer_info?: {
      paired_transaction_id: string;
      transfer_id: string;
      type: string;
      paired_account_id: string;
    };
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

    // Get recent transactions with transfer info in one query
    const recentTransactions = await transaksiDB.rawQueryAll<{
      id: string;
      jenis: string;
      nominal: string;
      catatan?: string;
      tanggal_transaksi: string;
      akun_id: string;
      transfer_id?: string;
      paired_transaction_id?: string;
      transfer_type?: string;
      paired_account_id?: string;
    }>(
      `SELECT 
        t.id,
        t.jenis,
        t.nominal::text AS nominal,
        t.catatan,
        t.tanggal_transaksi::text AS tanggal_transaksi,
        t.akun_id,
        ta.id as transfer_id,
        CASE 
          WHEN ta.transaksi_keluar_id = t.id THEN ta.transaksi_masuk_id
          WHEN ta.transaksi_masuk_id = t.id THEN ta.transaksi_keluar_id
        END as paired_transaction_id,
        CASE 
          WHEN ta.transaksi_keluar_id = t.id THEN 'keluar'
          WHEN ta.transaksi_masuk_id = t.id THEN 'masuk'
        END as transfer_type,
        CASE 
          WHEN ta.transaksi_keluar_id = t.id THEN t2.akun_id
          WHEN ta.transaksi_masuk_id = t.id THEN t1.akun_id
        END as paired_account_id
      FROM transaksi t
      LEFT JOIN transfer_antar_akun ta ON (ta.transaksi_keluar_id = t.id OR ta.transaksi_masuk_id = t.id)
      LEFT JOIN transaksi t1 ON ta.transaksi_keluar_id = t1.id
      LEFT JOIN transaksi t2 ON ta.transaksi_masuk_id = t2.id
      WHERE t.tenant_id = $1 AND t.dihapus_pada IS NULL
      ORDER BY t.tanggal_transaksi DESC, t.dibuat_pada DESC
      LIMIT 5`,
      req.tenant_id
    );

    // Format the response
    const formattedTransactions = recentTransactions.map(t => {
      const transaction: any = {
        id: t.id,
        jenis: t.jenis,
        nominal: parseInt(t.nominal) / 100,
        catatan: t.catatan,
        tanggal_transaksi: t.tanggal_transaksi,
        akun_id: t.akun_id
      };

      if (t.jenis === 'transfer' && t.transfer_id) {
        transaction.transfer_info = {
          paired_transaction_id: t.paired_transaction_id,
          transfer_id: t.transfer_id,
          type: t.transfer_type,
          paired_account_id: t.paired_account_id
        };
      }

      return transaction;
    });

    return {
      total_balance: parseInt(balanceResult?.total_balance || '0') / 100,
      monthly_income: parseInt(incomeResult?.monthly_income || '0') / 100,
      monthly_expense: parseInt(expenseResult?.monthly_expense || '0') / 100,
      accounts_count: accountsResult?.accounts_count || 0,
      goals_count: goalsResult?.goals_count || 0,
      completed_goals: goalsResult?.completed_goals || 0,
      recent_transactions: formattedTransactions
    };
  }
);