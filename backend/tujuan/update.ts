import { api, APIError } from "encore.dev/api";
import { tujuanDB } from "./db";
import { TujuanTabungan, JenisTujuan } from "./create";

interface UpdateTujuanParams {
  id: string;
}

interface UpdateTujuanRequest {
  nama_tujuan?: string;
  jenis_tujuan?: JenisTujuan;
  target_nominal?: number;
  tenggat_tanggal?: string;
  catatan?: string;
}

// Updates a savings goal.
export const update = api<UpdateTujuanParams & UpdateTujuanRequest, TujuanTabungan>(
  { expose: true, method: "PUT", path: "/tujuan/:id" },
  async ({ id, ...updates }) => {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.nama_tujuan !== undefined) {
      setParts.push(`nama_tujuan = $${paramIndex++}`);
      values.push(updates.nama_tujuan);
    }
    if (updates.jenis_tujuan !== undefined) {
      setParts.push(`jenis_tujuan = $${paramIndex++}`);
      values.push(updates.jenis_tujuan);
    }
    if (updates.target_nominal !== undefined) {
      const targetCents = Math.round(updates.target_nominal * 100);
      setParts.push(`target_nominal = $${paramIndex++}`);
      values.push(targetCents);
    }
    if (updates.tenggat_tanggal !== undefined) {
      setParts.push(`tenggat_tanggal = $${paramIndex++}`);
      values.push(updates.tenggat_tanggal);
    }
    if (updates.catatan !== undefined) {
      setParts.push(`catatan = $${paramIndex++}`);
      values.push(updates.catatan);
    }

    if (setParts.length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    values.push(id);
    const query = `
      UPDATE tujuan_tabungan 
      SET ${setParts.join(', ')}, diubah_pada = NOW()
      WHERE id = $${paramIndex} AND dihapus_pada IS NULL
      RETURNING id, tenant_id, nama_tujuan, jenis_tujuan, target_nominal, nominal_terkumpul, tenggat_tanggal, catatan, dibuat_pada, diubah_pada
    `;

    const row = await tujuanDB.rawQueryRow<TujuanTabungan>(query, ...values);
    
    if (!row) {
      throw APIError.notFound("savings goal not found");
    }
    
    // Convert from cents
    return {
      ...row,
      target_nominal: row.target_nominal / 100,
      nominal_terkumpul: row.nominal_terkumpul / 100,
    };
  }
);
