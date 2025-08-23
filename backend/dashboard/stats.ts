import { api } from "encore.dev/api";
import { akunDB } from "../akun/db";
import { transaksiDB } from "../transaksi/db";
import { tujuanDB } from "../tujuan/db";
import { kategoriDB } from "../kategori/db";

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
    nama_akun?: string;
    nama_kategori?: string;
    kategori_nama?: string;
    transfer_info?: {
      paired_transaction_id: string;
      transfer_id: string;
      type: string;
      paired_account_id: string;
      paired_account_name?: string;
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

    // Get recent transactions
    const recentTransactions = await transaksiDB.rawQueryAll<{
      id: string;
      jenis: string;
      nominal: string;
      catatan?: string;
      tanggal_transaksi: string;
      akun_id: string;
      kategori_id?: string;
    }>(
      `SELECT id, jenis, nominal::text AS nominal, catatan, tanggal_transaksi::text AS tanggal_transaksi, akun_id, kategori_id
       FROM transaksi
       WHERE tenant_id = $1 AND dihapus_pada IS NULL
       ORDER BY tanggal_transaksi DESC, dibuat_pada DESC
       LIMIT 10`,
      req.tenant_id
    );

    // Get transfer info
    const transferIds = recentTransactions.filter(t => t.jenis === 'transfer').map(t => t.id);
    const transferMap = new Map();
    const pairedAccounts = new Map();
    
    if (transferIds.length > 0) {
      const transfers = await transaksiDB.queryAll<{
        id: string;
        transaksi_keluar_id: string;
        transaksi_masuk_id: string;
      }>`
        SELECT id, transaksi_keluar_id, transaksi_masuk_id
        FROM transfer_antar_akun
        WHERE transaksi_keluar_id = ANY(${transferIds}) OR transaksi_masuk_id = ANY(${transferIds})
      `;
      
      transfers.forEach(t => {
        transferMap.set(t.transaksi_keluar_id, { transferId: t.id, type: 'keluar', pairedId: t.transaksi_masuk_id });
        transferMap.set(t.transaksi_masuk_id, { transferId: t.id, type: 'masuk', pairedId: t.transaksi_keluar_id });
      });

      const allTransferRelations = await transaksiDB.queryAll<{
        transfer_id: string;
        keluar_id: string;
        masuk_id: string;
        keluar_akun: string;
        masuk_akun: string;
      }>`
        SELECT 
          ta.id as transfer_id,
          ta.transaksi_keluar_id as keluar_id,
          ta.transaksi_masuk_id as masuk_id,
          t1.akun_id as keluar_akun,
          t2.akun_id as masuk_akun
        FROM transfer_antar_akun ta
        LEFT JOIN transaksi t1 ON ta.transaksi_keluar_id = t1.id
        LEFT JOIN transaksi t2 ON ta.transaksi_masuk_id = t2.id
        WHERE (ta.transaksi_keluar_id = ANY(${transferIds}) OR ta.transaksi_masuk_id = ANY(${transferIds}))
        AND t1.dihapus_pada IS NULL AND t2.dihapus_pada IS NULL
      `;
      
      allTransferRelations.forEach(rel => {
        pairedAccounts.set(rel.keluar_id, rel.masuk_akun);
        pairedAccounts.set(rel.masuk_id, rel.keluar_akun);
      });
    }

    // Get account and category names
    const accountIds = [...new Set(recentTransactions.map(r => r.akun_id))];
    const categoryIds = [...new Set(recentTransactions.map(r => r.kategori_id).filter(Boolean))];
    const pairedAccountIds = [...new Set(Array.from(pairedAccounts.values()))];
    const allAccountIds = [...new Set([...accountIds, ...pairedAccountIds])];

    const accountNames = new Map();
    if (allAccountIds.length > 0) {
      const accounts = await akunDB.queryAll<{id: string, nama_akun: string}>`
        SELECT id, nama_akun FROM akun WHERE id = ANY(${allAccountIds}) AND dihapus_pada IS NULL
      `;
      accounts.forEach(a => accountNames.set(a.id, a.nama_akun));
      
      const goals = await tujuanDB.queryAll<{id: string, nama_tujuan: string}>`
        SELECT id, nama_tujuan FROM tujuan_tabungan WHERE id = ANY(${allAccountIds}) AND dihapus_pada IS NULL
      `;
      goals.forEach(g => accountNames.set(g.id, `🎯 ${g.nama_tujuan}`));
    }

    const categoryNames = new Map();
    if (categoryIds.length > 0) {
      const categories = await kategoriDB.queryAll<{id: string, nama_kategori: string}>`
        SELECT id, nama_kategori FROM kategori WHERE id = ANY(${categoryIds}) AND dihapus_pada IS NULL
      `;
      categories.forEach(c => categoryNames.set(c.id, c.nama_kategori));
    }

    // Format the response
    const formattedTransactions = recentTransactions.slice(0, 5).map(t => {
      const transaction: any = {
        id: t.id,
        jenis: t.jenis,
        nominal: parseInt(t.nominal) / 100,
        catatan: t.catatan,
        tanggal_transaksi: t.tanggal_transaksi,
        akun_id: t.akun_id,
        nama_akun: accountNames.get(t.akun_id),
        nama_kategori: categoryNames.get(t.kategori_id),
        kategori_nama: categoryNames.get(t.kategori_id)
      };

      if (t.jenis === 'transfer') {
        const transferInfo = transferMap.get(t.id);
        if (transferInfo) {
          transaction.transfer_info = {
            paired_transaction_id: transferInfo.pairedId,
            transfer_id: transferInfo.transferId,
            type: transferInfo.type,
            paired_account_id: pairedAccounts.get(t.id),
            paired_account_name: accountNames.get(pairedAccounts.get(t.id))
          };
        } else {
          transaction.transfer_info = {
            paired_transaction_id: null,
            transfer_id: null,
            type: 'keluar',
            paired_account_id: null,
            paired_account_name: null
          };
        }
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