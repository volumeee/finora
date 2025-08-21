import { api } from "encore.dev/api";

export interface KalkulatorDanaDaruratRequest {
  pengeluaran_bulanan: number;
  jumlah_bulan: number; // 3-12 months
  target_waktu_bulan?: number; // how many months to reach the goal
}

export interface KalkulatorDanaDaruratResponse {
  target_dana_darurat: number;
  tabungan_bulanan_diperlukan: number;
  rekomendasi_instrumen: string[];
  skenario: {
    konservatif: {
      jumlah_bulan: number;
      target_nominal: number;
    };
    moderat: {
      jumlah_bulan: number;
      target_nominal: number;
    };
    agresif: {
      jumlah_bulan: number;
      target_nominal: number;
    };
  };
}

// Calculates emergency fund requirements.
export const hitungDanaDarurat = api<KalkulatorDanaDaruratRequest, KalkulatorDanaDaruratResponse>(
  { expose: true, method: "POST", path: "/kalkulator/dana-darurat" },
  async (req) => {
    const targetDanaDarurat = req.pengeluaran_bulanan * req.jumlah_bulan;
    const targetWaktu = req.target_waktu_bulan || 12;
    const tabunganBulananDiperlukan = targetDanaDarurat / targetWaktu;
    
    const rekomendasiInstrumen = [
      "Tabungan Bank (Likuiditas Tinggi)",
      "Deposito Berjangka (3-6 bulan)",
      "Reksa Dana Pasar Uang",
      "Obligasi Pemerintah Jangka Pendek"
    ];
    
    return {
      target_dana_darurat: targetDanaDarurat,
      tabungan_bulanan_diperlukan: tabunganBulananDiperlukan,
      rekomendasi_instrumen: rekomendasiInstrumen,
      skenario: {
        konservatif: {
          jumlah_bulan: 6,
          target_nominal: req.pengeluaran_bulanan * 6
        },
        moderat: {
          jumlah_bulan: 9,
          target_nominal: req.pengeluaran_bulanan * 9
        },
        agresif: {
          jumlah_bulan: 12,
          target_nominal: req.pengeluaran_bulanan * 12
        }
      }
    };
  }
);
