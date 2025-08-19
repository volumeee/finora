import { api, APIError } from "encore.dev/api";
import { akunDB } from "./db";
import { Akun, JenisAkun } from "./create";

interface UpdateAkunParams {
  id: string;
}

interface UpdateAkunRequest {
  nama_akun?: string;
  jenis?: JenisAkun;
  mata_uang?: string;
  saldo_awal?: number;
  keterangan?: string;
}

// Updates an account.
export const update = api<UpdateAkunParams & UpdateAkunRequest, Akun>(
  { expose: true, method: "PUT", path: "/akun/:id" },
  async ({ id, ...updates }) => {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.nama_akun !== undefined) {
      setParts.push(`nama_akun = $${paramIndex++}`);
      values.push(updates.nama_akun);
    }
    if (updates.jenis !== undefined) {
      setParts.push(`jenis = $${paramIndex++}`);
      values.push(updates.jenis);
    }
    if (updates.mata_uang !== undefined) {
      setParts.push(`mata_uang = $${paramIndex++}`);
      values.push(updates.mata_uang);
    }
    if (updates.saldo_awal !== undefined) {
      setParts.push(`saldo_awal = $${paramIndex++}`);
      values.push(updates.saldo_awal);
      // Update saldo_terkini if saldo_awal changes
      setParts.push(`saldo_terkini = $${paramIndex++}`);
      values.push(updates.saldo_awal);
    }
    if (updates.keterangan !== undefined) {
      setParts.push(`keterangan = $${paramIndex++}`);
      values.push(updates.keterangan);
    }

    if (setParts.length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    values.push(id);
    const query = `
      UPDATE akun 
      SET ${setParts.join(', ')}, diubah_pada = NOW()
      WHERE id = $${paramIndex} AND dihapus_pada IS NULL
      RETURNING id, tenant_id, nama_akun, jenis, mata_uang, saldo_awal, saldo_terkini, keterangan, dibuat_pada, diubah_pada
    `;

    const row = await akunDB.rawQueryRow<Akun>(query, ...values);
    
    if (!row) {
      throw APIError.notFound("account not found");
    }
    
    return row;
  }
);
