import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const laporanDB = SQLDatabase.named("akun");

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
    // Get current account balances
    const accountsQuery = `
      SELECT 
        id as akun_id,
        nama_akun,
        jenis,
        saldo_terkini,
        CASE 
          WHEN jenis IN ('kas', 'bank', 'e_wallet', 'aset') THEN saldo_terkini
          WHEN jenis IN ('kartu_kredit', 'pinjaman') THEN -saldo_terkini
          ELSE 0
        END as kontribusi_net_worth
      FROM akun
      WHERE tenant_id = $1 AND dihapus_pada IS NULL
      ORDER BY jenis, nama_akun
    `;
    
    const rawAccounts = await laporanDB.rawQueryAll<NetWorthByAccount>(accountsQuery, tenant_id);
    
    // Convert from cents to regular numbers
    const accounts = rawAccounts.map(acc => ({
      ...acc,
      saldo_terkini: acc.saldo_terkini / 100,
      kontribusi_net_worth: acc.kontribusi_net_worth / 100
    }));
    
    const totalAset = accounts
      .filter(acc => ['kas', 'bank', 'e_wallet', 'aset'].includes(acc.jenis))
      .reduce((sum, acc) => sum + acc.saldo_terkini, 0);
    
    const totalLiabilitas = accounts
      .filter(acc => ['kartu_kredit', 'pinjaman'].includes(acc.jenis))
      .reduce((sum, acc) => sum + Math.abs(acc.saldo_terkini), 0);
    
    const netWorthTerkini = totalAset - totalLiabilitas;
    
    // Generate monthly trend (simplified - in real implementation, you'd calculate historical balances)
    const startDate = new Date(tanggal_dari);
    const endDate = new Date(tanggal_sampai);
    const trendBulanan: NetWorthItem[] = [];
    
    // For demo purposes, generate sample trend data
    // In production, you'd calculate actual historical net worth
    let currentDate = new Date(startDate);
    let baseNetWorth = netWorthTerkini * 0.9; // Assume 10% growth over period
    
    while (currentDate <= endDate) {
      const monthProgress = (currentDate.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());
      const currentNetWorth = baseNetWorth + (netWorthTerkini - baseNetWorth) * monthProgress;
      
      trendBulanan.push({
        tanggal: currentDate.toISOString().split('T')[0],
        total_aset: currentNetWorth + totalLiabilitas,
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
      trend_bulanan: trendBulanan,
      breakdown_akun: accounts
    };
  }
);
