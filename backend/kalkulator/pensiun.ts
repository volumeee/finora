import { api } from "encore.dev/api";

export interface KalkulatorPensiunRequest {
  usia_sekarang: number;
  usia_pensiun: number;
  target_passive_income_bulanan: number;
  inflasi_tahunan_persen?: number;
  return_investasi_tahunan_persen?: number;
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
    const inflasiTahunan = (req.inflasi_tahunan_persen || 3) / 100;
    const returnInvestasi = (req.return_investasi_tahunan_persen || 8) / 100;
    
    // Calculate future value of target passive income
    const targetPassiveIncomeFuture = req.target_passive_income_bulanan * 12 * 
      Math.pow(1 + inflasiTahunan, tahunMenabung);
    
    // Assuming 4% withdrawal rate for retirement
    const targetDanaPensiun = targetPassiveIncomeFuture / 0.04;
    
    // Calculate required monthly savings using FV of annuity formula
    const monthlyReturn = returnInvestasi / 12;
    const totalMonths = tahunMenabung * 12;
    
    const tabunganBulananDiperlukan = targetDanaPensiun * monthlyReturn / 
      (Math.pow(1 + monthlyReturn, totalMonths) - 1);
    
    const nilaiSekarangTarget = targetDanaPensiun / Math.pow(1 + returnInvestasi, tahunMenabung);
    
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
      nilaiInvestasi = (nilaiInvestasi + kontribusiTahunan) * (1 + returnInvestasi);
      proyeksiTahunan.push({
        tahun,
        usia: req.usia_sekarang + tahun,
        kontribusi_tahunan: Math.round(kontribusiTahunan),
        nilai_investasi: Math.round(nilaiInvestasi)
      });
    }
    
    return {
      tahun_menabung: tahunMenabung,
      target_dana_pensiun: Math.round(targetDanaPensiun),
      tabungan_bulanan_diperlukan: Math.round(tabunganBulananDiperlukan),
      nilai_sekarang_target: Math.round(nilaiSekarangTarget),
      rekomendasi_investasi: rekomendasiInvestasi,
      proyeksi_tahunan
    };
  }
);
