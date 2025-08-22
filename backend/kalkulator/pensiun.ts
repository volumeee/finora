import { api } from "encore.dev/api";

export interface KalkulatorPensiunRequest {
  usia_sekarang: number;
  usia_pensiun: number;
  target_passive_income_bulanan: number;
  inflasi_tahunan?: number;
  return_investasi_tahunan?: number;
  pengeluaran_bulanan_sekarang?: number;
  proyeksi_tahunan?: number;
}

export interface KalkulatorPensiunResponse {
  tahun_menabung: number;
  target_dana_pensiun: number;
  tabungan_bulanan_diperlukan: number;
  nilai_sekarang_target: number;
  rekomendasi_investasi: string[];
  proyeksi_tahunan: {
    tahun: number;
    usia: number;
    kontribusi_tahunan: number;
    nilai_investasi: number;
  }[];
}

// Calculates retirement planning requirements.
export const hitungPensiun = api<KalkulatorPensiunRequest, KalkulatorPensiunResponse>(
  { expose: true, method: "POST", path: "/kalkulator/pensiun" },
  async (req) => {
    const tahunMenabung = req.usia_pensiun - req.usia_sekarang;
    const inflasiTahunan = (req.inflasi_tahunan || 3) / 100;
    const returnInvestasi = (req.return_investasi_tahunan || 8) / 100;
    
    // Real return after inflation
    const realReturn = (1 + returnInvestasi) / (1 + inflasiTahunan) - 1;
    
    // Target passive income in today's purchasing power
    const targetPassiveIncomeAnnual = req.target_passive_income_bulanan * 12;
    
    // Calculate target fund needed using 4% withdrawal rule (25x annual income)
    const targetDanaPensiun = targetPassiveIncomeAnnual * 25;
    
    // Calculate required monthly savings using real return (inflation-adjusted)
    const monthlyRealReturn = realReturn / 12;
    const totalMonths = tahunMenabung * 12;
    
    let tabunganBulananDiperlukan;
    if (Math.abs(monthlyRealReturn) < 0.0001) {
      // If real return is near zero, use simple division
      tabunganBulananDiperlukan = targetDanaPensiun / totalMonths;
    } else {
      // PMT formula with real return
      tabunganBulananDiperlukan = targetDanaPensiun * monthlyRealReturn / 
        ((1 + monthlyRealReturn) ** totalMonths - 1);
    }
    
    const nilaiSekarangTarget = targetDanaPensiun / (1 + realReturn) ** tahunMenabung;
    
    const rekomendasiInvestasi = [
      "Reksa Dana Saham (Jangka Panjang)",
      "ETF Indeks",
      "Saham Blue Chip",
      "Obligasi Pemerintah",
      "Properti (REIT)"
    ];
    
    // Generate yearly projections
    const proyeksiTahunan = [];
    let nilaiInvestasi = 0;
    const kontribusiTahunan = tabunganBulananDiperlukan * 12;
    
    for (let tahun = 1; tahun <= tahunMenabung; tahun++) {
      nilaiInvestasi = (nilaiInvestasi + kontribusiTahunan) * (1 + realReturn);
      proyeksiTahunan.push({
        tahun,
        usia: req.usia_sekarang + tahun,
        kontribusi_tahunan: kontribusiTahunan,
        nilai_investasi: nilaiInvestasi
      });
    }
    
    return {
      tahun_menabung: tahunMenabung,
      target_dana_pensiun: targetDanaPensiun,
      tabungan_bulanan_diperlukan: tabunganBulananDiperlukan,
      nilai_sekarang_target: nilaiSekarangTarget,
      rekomendasi_investasi: rekomendasiInvestasi,
      proyeksi_tahunan: proyeksiTahunan
    };
  }
);
