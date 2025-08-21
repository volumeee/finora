import { api } from "encore.dev/api";
import { tujuanDB } from "./db";

export type JenisTujuan = "dana_darurat" | "rumah" | "kendaraan" | "liburan" | "pendidikan" | "pensiun" | "lainnya";

export interface CreateTujuanRequest {
  tenant_id: string;
  nama_tujuan: string;
  jenis_tujuan: JenisTujuan;
  target_nominal: number;
  tenggat_tanggal?: string;
  catatan?: string;
}

export interface TujuanTabungan {
  id: string;
  tenant_id: string;
  nama_tujuan: string;
  jenis_tujuan: JenisTujuan;
  target_nominal: number;
  nominal_terkumpul: number;
  tenggat_tanggal?: string;
  catatan?: string;
  dibuat_pada: Date;
  diubah_pada: Date;
}

// Creates a new savings goal.
export const create = api<CreateTujuanRequest, TujuanTabungan>(
  { expose: true, method: "POST", path: "/tujuan" },
  async (req) => {
    // Convert to cents for database
    const targetCents = Math.round(req.target_nominal * 100);
    
    const row = await tujuanDB.queryRow<TujuanTabungan>`
      INSERT INTO tujuan_tabungan (tenant_id, nama_tujuan, jenis_tujuan, target_nominal, tenggat_tanggal, catatan)
      VALUES (${req.tenant_id}, ${req.nama_tujuan}, ${req.jenis_tujuan}, ${targetCents}, ${req.tenggat_tanggal}, ${req.catatan})
      RETURNING id, tenant_id, nama_tujuan, jenis_tujuan, target_nominal, nominal_terkumpul, tenggat_tanggal, catatan, dibuat_pada, diubah_pada
    `;
    
    if (!row) {
      throw new Error("Failed to create savings goal");
    }
    
    // Convert back from cents
    return {
      ...row,
      target_nominal: row.target_nominal / 100,
      nominal_terkumpul: row.nominal_terkumpul / 100,
    };
  }
);
