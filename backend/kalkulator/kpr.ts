import { api } from "encore.dev/api";

export interface KalkulatorKPRRequest {
  harga_properti: number;
  uang_muka_persen: number;
  tenor_tahun: number;
  bunga_tahunan_persen: number;
  tipe_bunga: "fixed" | "floating";
  biaya_provisi?: number;
  biaya_admin?: number;
}

export interface AngsuranBulanan {
  bulan: number;
  angsuran_pokok: number;
  angsuran_bunga: number;
  total_angsuran: number;
  sisa_pokok: number;
}

export interface KalkulatorKPRResponse {
  uang_muka: number;
  jumlah_pinjaman: number;
  angsuran_bulanan: number;
  total_bunga: number;
  total_pembayaran: number;
  biaya_tambahan: number;
  tabel_angsuran: AngsuranBulanan[];
}

// Calculates mortgage payment details.
export const hitungKPR = api<KalkulatorKPRRequest, KalkulatorKPRResponse>(
  { expose: true, method: "POST", path: "/kalkulator/kpr" },
  async (req) => {
    const uangMuka = req.harga_properti * (req.uang_muka_persen / 100);
    const jumlahPinjaman = req.harga_properti - uangMuka;
    const bungaBulanan = req.bunga_tahunan_persen / 100 / 12;
    const jumlahBulan = req.tenor_tahun * 12;
    const biayaTambahan = (req.biaya_provisi || 0) + (req.biaya_admin || 0);
    
    // Calculate monthly payment using PMT formula
    const angsuranBulanan = jumlahPinjaman * 
      (bungaBulanan * Math.pow(1 + bungaBulanan, jumlahBulan)) / 
      (Math.pow(1 + bungaBulanan, jumlahBulan) - 1);
    
    // Generate amortization table
    const tabelAngsuran: AngsuranBulanan[] = [];
    let sisaPokok = jumlahPinjaman;
    let totalBunga = 0;
    
    for (let bulan = 1; bulan <= jumlahBulan; bulan++) {
      const angsuranBunga = sisaPokok * bungaBulanan;
      const angsuranPokok = angsuranBulanan - angsuranBunga;
      sisaPokok -= angsuranPokok;
      totalBunga += angsuranBunga;
      
      tabelAngsuran.push({
        bulan,
        angsuran_pokok: Math.round(angsuranPokok),
        angsuran_bunga: Math.round(angsuranBunga),
        total_angsuran: Math.round(angsuranBulanan),
        sisa_pokok: Math.round(Math.max(0, sisaPokok))
      });
    }
    
    const totalPembayaran = angsuranBulanan * jumlahBulan + biayaTambahan;
    
    return {
      uang_muka: Math.round(uangMuka),
      jumlah_pinjaman: Math.round(jumlahPinjaman),
      angsuran_bulanan: Math.round(angsuranBulanan),
      total_bunga: Math.round(totalBunga),
      total_pembayaran: Math.round(totalPembayaran),
      biaya_tambahan: Math.round(biayaTambahan),
      tabel_angsuran
    };
  }
);
