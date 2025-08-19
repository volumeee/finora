import { api } from "encore.dev/api";

export interface KalkulatorCustomGoalRequest {
  target_nominal: number;
  target_tanggal: string; // YYYY-MM-DD
  nominal_awal?: number;
  return_investasi_tahunan_persen?: number;
}

export interface SkenarioTabungan {
  jenis: string;
  tabungan_bulanan: number;
  total_kontribusi: number;
  return_investasi: number;
  kemungkinan_tercapai: string;
}

export interface KalkulatorCustomGoalResponse {
  bulan_tersisa: number;
  tabungan_bulanan_diperlukan: number;
  skenario: SkenarioTabungan[];
  milestone: {
    bulan: number;
    target_tercapai_persen: number;
    nominal_tercapai: number;
  }[];
}

// Calculates custom savings goal requirements.
export const hitungCustomGoal = api<KalkulatorCustomGoalRequest, KalkulatorCustomGoalResponse>(
  { expose: true, method: "POST", path: "/kalkulator/custom-goal" },
  async (req) => {
    const targetDate = new Date(req.target_tanggal);
    const currentDate = new Date();
    const bulanTersisa = Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    const nominalAwal = req.nominal_awal || 0;
    const sisaTarget = req.target_nominal - nominalAwal;
    const returnTahunan = (req.return_investasi_tahunan_persen || 0) / 100;
    const returnBulanan = returnTahunan / 12;
    
    // Calculate required monthly savings without investment return
    const tabunganBulananTanpaInvestasi = sisaTarget / bulanTersisa;
    
    // Calculate required monthly savings with investment return
    let tabunganBulananDenganInvestasi = tabunganBulananTanpaInvestasi;
    if (returnBulanan > 0) {
      tabunganBulananDenganInvestasi = sisaTarget * returnBulanan / 
        (Math.pow(1 + returnBulanan, bulanTersisa) - 1);
    }
    
    const skenario: SkenarioTabungan[] = [
      {
        jenis: "Lump Sum (Sekaligus)",
        tabungan_bulanan: 0,
        total_kontribusi: sisaTarget,
        return_investasi: 0,
        kemungkinan_tercapai: bulanTersisa > 1 ? "Rendah" : "Tinggi"
      },
      {
        jenis: "Tabungan Reguler",
        tabungan_bulanan: Math.round(tabunganBulananTanpaInvestasi),
        total_kontribusi: Math.round(tabunganBulananTanpaInvestasi * bulanTersisa),
        return_investasi: 0,
        kemungkinan_tercapai: "Tinggi"
      }
    ];
    
    if (returnTahunan > 0) {
      skenario.push({
        jenis: "Investasi + Tabungan",
        tabungan_bulanan: Math.round(tabunganBulananDenganInvestasi),
        total_kontribusi: Math.round(tabunganBulananDenganInvestasi * bulanTersisa),
        return_investasi: Math.round((tabunganBulananDenganInvestasi * bulanTersisa * returnTahunan * bulanTersisa / 12)),
        kemungkinan_tercapai: "Sedang"
      });
    }
    
    // Generate milestones (25%, 50%, 75%, 100%)
    const milestone = [25, 50, 75, 100].map(persen => {
      const targetPersen = persen / 100;
      const bulanMilestone = Math.ceil(bulanTersisa * targetPersen);
      const nominalTercapai = nominalAwal + (sisaTarget * targetPersen);
      
      return {
        bulan: bulanMilestone,
        target_tercapai_persen: persen,
        nominal_tercapai: Math.round(nominalTercapai)
      };
    });
    
    return {
      bulan_tersisa: bulanTersisa,
      tabungan_bulanan_diperlukan: Math.round(tabunganBulananTanpaInvestasi),
      skenario,
      milestone
    };
  }
);
