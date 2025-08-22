import { api } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { randomUUID } from "node:crypto";

const db = new SQLDatabase("kalkulator", {
  migrations: "./migrations",
});

export interface KalkulatorKPRRequest {
  harga_properti: number;
  uang_muka_persen: number; // dalam persen (10 = 10%)
  tenor_tahun: number;
  bunga_tahunan_persen: number; // dalam persen (5 = 5%)
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

export interface SaveCalculationRequest {
  tenant_id: string;
  nama_perhitungan: string;
  tipe_kalkulator: "kpr" | "emergency" | "retirement" | "custom";
  input_data: any;
  result_data: any;
}

export interface SavedCalculation {
  id: string;
  tenant_id: string;
  nama_perhitungan: string;
  tipe_kalkulator: string;
  input_data: any;
  result_data: any;
  created_at: string;
}

// Calculates mortgage payment details.
export const hitungKPR = api<KalkulatorKPRRequest, KalkulatorKPRResponse>(
  { expose: true, method: "POST", path: "/kalkulator/kpr" },
  async (req) => {
    const uangMuka = req.harga_properti * (req.uang_muka_persen / 100);
    const jumlahPinjaman = req.harga_properti - uangMuka;
    const jumlahBulan = req.tenor_tahun * 12;
    const biayaTambahan = (req.biaya_provisi || 0) + (req.biaya_admin || 0);

    let angsuranBulanan: number;
    let totalBunga = 0;
    const tabelAngsuran: AngsuranBulanan[] = [];

    if (req.tipe_bunga === "fixed") {
      // Fixed rate calculation - same rate throughout
      const bungaBulanan = req.bunga_tahunan_persen / 100 / 12;

      angsuranBulanan =
        (jumlahPinjaman *
          bungaBulanan *
          Math.pow(1 + bungaBulanan, jumlahBulan)) /
        (Math.pow(1 + bungaBulanan, jumlahBulan) - 1);

      let sisaPokok = jumlahPinjaman;

      for (let bulan = 1; bulan <= jumlahBulan; bulan++) {
        const angsuranBunga = sisaPokok * bungaBulanan;
        const angsuranPokok = angsuranBulanan - angsuranBunga;
        sisaPokok -= angsuranPokok;
        totalBunga += angsuranBunga;

        tabelAngsuran.push({
          bulan,
          angsuran_pokok: angsuranPokok,
          angsuran_bunga: angsuranBunga,
          total_angsuran: angsuranBulanan,
          sisa_pokok: Math.max(0, sisaPokok),
        });
      }
    } else {
      // Floating rate calculation - rate can vary (simplified: higher initial rate)
      let sisaPokok = jumlahPinjaman;
      let totalAngsuran = 0;

      for (let bulan = 1; bulan <= jumlahBulan; bulan++) {
        // Floating rate: starts higher, gradually decreases
        const rateAdjustment = 1 + (0.5 * (jumlahBulan - bulan)) / jumlahBulan;
        const bungaBulananFloat =
          (req.bunga_tahunan_persen * rateAdjustment) / 100 / 12;

        // Calculate remaining payment using current rate
        const sisaBulan = jumlahBulan - bulan + 1;
        const angsuranBulananFloat =
          (sisaPokok *
            bungaBulananFloat *
            Math.pow(1 + bungaBulananFloat, sisaBulan)) /
          (Math.pow(1 + bungaBulananFloat, sisaBulan) - 1);

        const angsuranBunga = sisaPokok * bungaBulananFloat;
        const angsuranPokok = angsuranBulananFloat - angsuranBunga;
        sisaPokok -= angsuranPokok;
        totalBunga += angsuranBunga;
        totalAngsuran += angsuranBulananFloat;

        tabelAngsuran.push({
          bulan,
          angsuran_pokok: angsuranPokok,
          angsuran_bunga: angsuranBunga,
          total_angsuran: angsuranBulananFloat,
          sisa_pokok: Math.max(0, sisaPokok),
        });
      }

      angsuranBulanan = totalAngsuran / jumlahBulan; // Average monthly payment
    }

    const totalPembayaran =
      (req.tipe_bunga === "fixed"
        ? angsuranBulanan * jumlahBulan
        : tabelAngsuran.reduce((sum, row) => sum + row.total_angsuran, 0)) +
      biayaTambahan;

    return {
      uang_muka: uangMuka,
      jumlah_pinjaman: jumlahPinjaman,
      angsuran_bulanan: angsuranBulanan,
      total_bunga: totalBunga,
      total_pembayaran: totalPembayaran,
      biaya_tambahan: biayaTambahan,
      tabel_angsuran: tabelAngsuran,
    };
  }
);

// Save calculation
export const saveCalculation = api<SaveCalculationRequest, { id: string }>(
  { expose: true, method: "POST", path: "/kalkulator/save" },
  async (req) => {
    const id = randomUUID();
    await db.exec`
      INSERT INTO calculator_results (
        id, tenant_id, nama_perhitungan, tipe_kalkulator, input_data, result_data
      ) VALUES (
        ${id}::uuid, ${req.tenant_id}::uuid, ${req.nama_perhitungan}, ${
      req.tipe_kalkulator
    }, ${JSON.stringify(req.input_data)}, ${JSON.stringify(req.result_data)}
      )
    `;
    return { id };
  }
);

export interface GetSavedCalculationsResponse {
  calculations: SavedCalculation[];
}

// Get saved calculations
export const getSavedCalculations = api<
  { tenant_id: string; type?: string },
  GetSavedCalculationsResponse
>(
  { expose: true, method: "GET", path: "/kalkulator/saved" },
  async ({ tenant_id, type }) => {
    const result = type
      ? await db.query`
          SELECT id,
                 tenant_id,
                 nama_perhitungan,
                 tipe_kalkulator,
                 input_data,
                 result_data,
                 created_at
          FROM calculator_results
          WHERE tenant_id = ${tenant_id}::uuid AND tipe_kalkulator = ${type}`
      : await db.query`
          SELECT id,
                 tenant_id,
                 nama_perhitungan,
                 tipe_kalkulator,
                 input_data,
                 result_data,
                 created_at
          FROM calculator_results
          WHERE tenant_id = ${tenant_id}::uuid`;

    const rows = [];
    for await (const row of result) {
      rows.push(row);
    }

    return {
      calculations: rows.map((row: any) => ({
        ...row,
        input_data: JSON.parse(row.input_data),
        result_data: JSON.parse(row.result_data),
      })),
    };
  }
);

// Get specific saved calculation
export const getSavedCalculation = api<
  { id: string; tenant_id: string },
  SavedCalculation
>(
  { expose: true, method: "GET", path: "/kalkulator/saved/:id" },
  async ({ id, tenant_id }) => {
    const result = await db.query`
      SELECT id,
             tenant_id,
             nama_perhitungan,
             tipe_kalkulator,
             input_data,
             result_data,
             created_at
      FROM calculator_results
      WHERE id = ${id}::uuid AND tenant_id = ${tenant_id}::uuid
    `;
    
    const rows = [];
    for await (const row of result) {
      rows.push(row);
    }
    
    if (rows.length === 0) {
      throw new Error("Calculation not found");
    }
    return {
      ...rows[0],
      input_data: JSON.parse(rows[0].input_data),
      result_data: JSON.parse(rows[0].result_data),
    };
  }
);

// Update calculation
export const updateCalculation = api<
  SaveCalculationRequest & { id: string },
  { success: boolean }
>(
  { expose: true, method: "PUT", path: "/kalkulator/saved/:id" },
  async ({
    id,
    tenant_id,
    nama_perhitungan,
    tipe_kalkulator,
    input_data,
    result_data,
  }) => {
    await db.exec`
      UPDATE calculator_results
      SET nama_perhitungan = ${nama_perhitungan},
          tipe_kalkulator = ${tipe_kalkulator},
          input_data = ${JSON.stringify(input_data)},
          result_data = ${JSON.stringify(result_data)},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}::uuid AND tenant_id = ${tenant_id}::uuid
    `;
    return { success: true };
  }
);

// Delete calculation
export const deleteCalculation = api<
  { id: string; tenant_id: string },
  { success: boolean }
>(
  { expose: true, method: "DELETE", path: "/kalkulator/saved/:id" },
  async ({ id, tenant_id }) => {
    await db.exec`
      DELETE FROM calculator_results
      WHERE id = ${id}::uuid AND tenant_id = ${tenant_id}::uuid
    `;
    return { success: true };
  }
);
