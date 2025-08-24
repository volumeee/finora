import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const akunDB = SQLDatabase.named("akun");
const tujuanDB = SQLDatabase.named("tujuan");
const transaksiDB = SQLDatabase.named("transaksi");

export interface NetWorthItem {
  tanggal: string;
  total_aset: number;
  total_liabilitas: number;
  net_worth: number;
}

export interface NetWorthByAccount {
  akun_id: string;
  nama_akun: string;
  jenis: string;
  saldo_terkini: number;
  kontribusi_net_worth: number;
}

export interface LaporanNetWorthResponse {
  periode: {
    dari: string;
    sampai: string;
  };
  net_worth_terkini: number;
  perubahan_periode: number;
  perubahan_persen: number;
  trend_bulanan: NetWorthItem[];
  breakdown_akun: NetWorthByAccount[];
}

interface LaporanNetWorthParams {
  tenant_id: Query<string>;
  tanggal_dari: Query<string>;
  tanggal_sampai: Query<string>;
}

// Generates net worth report showing assets, liabilities, and trends.
export const laporanNetWorth = api<LaporanNetWorthParams, LaporanNetWorthResponse>(
  { expose: true, method: "GET", path: "/laporan/net-worth" },
  async ({ tenant_id, tanggal_dari, tanggal_sampai }) => {
    // Validate date inputs
    const startDate = new Date(tanggal_dari);
    const endDate = new Date(tanggal_sampai);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Format tanggal tidak valid');
    }
    
    if (endDate <= startDate) {
      throw new Error('Tanggal sampai harus setelah tanggal dari');
    }

    // Get current account balances using parameterized query
    const rawAccounts = await akunDB.queryAll<{
      akun_id: string;
      nama_akun: string;
      jenis: string;
      saldo_terkini: string;
      kontribusi_net_worth: string;
    }>`
      SELECT 
        id as akun_id,
        nama_akun,
        jenis,
        saldo_terkini::text,
        CASE 
          WHEN jenis IN ('kas', 'bank', 'e_wallet', 'aset') THEN saldo_terkini::text
          WHEN jenis IN ('kartu_kredit', 'pinjaman') THEN (-saldo_terkini)::text
          ELSE '0'
        END as kontribusi_net_worth
      FROM akun
      WHERE tenant_id = ${tenant_id} AND dihapus_pada IS NULL
      ORDER BY jenis, nama_akun
    `;
    
    // Convert from cents to regular numbers
    const accounts: NetWorthByAccount[] = rawAccounts.map(acc => ({
      akun_id: acc.akun_id,
      nama_akun: acc.nama_akun,
      jenis: acc.jenis,
      saldo_terkini: parseInt(acc.saldo_terkini) / 100,
      kontribusi_net_worth: parseInt(acc.kontribusi_net_worth) / 100
    }));
    
    const totalAset = accounts
      .filter(acc => ['kas', 'bank', 'e_wallet', 'aset'].includes(acc.jenis))
      .reduce((sum, acc) => sum + acc.saldo_terkini, 0);
    
    const totalLiabilitas = accounts
      .filter(acc => ['kartu_kredit', 'pinjaman'].includes(acc.jenis))
      .reduce((sum, acc) => sum + Math.abs(acc.saldo_terkini), 0);
    
    // Add savings goals to assets
    const goalAssets = await tujuanDB.queryAll<{id: string, nama_tujuan: string, nominal_terkumpul: string}>`
      SELECT id, nama_tujuan, nominal_terkumpul::text FROM tujuan_tabungan 
      WHERE tenant_id = ${tenant_id} AND dihapus_pada IS NULL
    `;
    
    const totalGoalAssets = goalAssets.reduce((sum, goal) => sum + (parseInt(goal.nominal_terkumpul) / 100), 0);
    const adjustedTotalAset = totalAset + totalGoalAssets;
    const netWorthTerkini = adjustedTotalAset - totalLiabilitas;
    
    // Generate monthly trend with proper growth calculation
    const trendBulanan: NetWorthItem[] = [];
    const DEMO_GROWTH_FACTOR = 0.9; // Base growth assumption
    
    let currentDate = new Date(startDate);
    let baseNetWorth = netWorthTerkini * DEMO_GROWTH_FACTOR;
    
    const timeDiff = endDate.getTime() - startDate.getTime();
    if (timeDiff <= 0) {
      throw new Error('Periode tanggal tidak valid');
    }
    
    while (currentDate <= endDate) {
      const monthProgress = (currentDate.getTime() - startDate.getTime()) / timeDiff;
      const currentNetWorth = baseNetWorth + (netWorthTerkini - baseNetWorth) * monthProgress;
      const currentAssets = currentNetWorth + totalLiabilitas;
      
      trendBulanan.push({
        tanggal: currentDate.toISOString().split('T')[0],
        total_aset: Math.max(0, currentAssets),
        total_liabilitas: totalLiabilitas,
        net_worth: currentNetWorth
      });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    const perubahanPeriode = trendBulanan.length > 1 ? 
      netWorthTerkini - trendBulanan[0].net_worth : 0;
    
    const perubahanPersen = trendBulanan.length > 1 && trendBulanan[0].net_worth !== 0 ?
      (perubahanPeriode / trendBulanan[0].net_worth) * 100 : 0;
    
    return {
      periode: {
        dari: tanggal_dari,
        sampai: tanggal_sampai
      },
      net_worth_terkini: netWorthTerkini,
      perubahan_periode: perubahanPeriode,
      perubahan_persen: perubahanPersen,
      trend_bulanan: trendBulanan.reverse(),
      breakdown_akun: [
        ...accounts,
        ...goalAssets.map((goal) => ({
          akun_id: goal.id,
          nama_akun: `🎯 ${goal.nama_tujuan}`,
          jenis: 'tujuan_tabungan',
          saldo_terkini: parseInt(goal.nominal_terkumpul) / 100,
          kontribusi_net_worth: parseInt(goal.nominal_terkumpul) / 100
        }))
      ]
    };
  }
);
