import { api, APIError } from "encore.dev/api";
import { transaksiDB } from "./db";
import { Transaksi, JenisTransaksi, SplitKategori } from "./create";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const akunDB = SQLDatabase.named("akun");

interface UpdateTransaksiParams {
  id: string;
}

interface UpdateTransaksiRequest {
  akun_id?: string;
  kategori_id?: string;
  jenis?: JenisTransaksi;
  nominal?: number;
  mata_uang?: string;
  tanggal_transaksi?: string;
  catatan?: string;
  split_kategori?: SplitKategori[];
}

// Updates a transaction.
export const update = api<
  UpdateTransaksiParams & UpdateTransaksiRequest,
  Transaksi
>(
  { expose: true, method: "PUT", path: "/transaksi/:id" },
  async ({ id, ...updates }) => {
    const tx = await transaksiDB.begin();

    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.akun_id !== undefined) {
        setParts.push(`akun_id = $${paramIndex++}`);
        values.push(updates.akun_id);
      }
      if (updates.kategori_id !== undefined) {
        setParts.push(`kategori_id = $${paramIndex++}`);
        values.push(updates.kategori_id);
      }
      if (updates.jenis !== undefined) {
        setParts.push(`jenis = $${paramIndex++}`);
        values.push(updates.jenis);
      }
      if (updates.nominal !== undefined) {
        const nominalCents = BigInt(Math.round(updates.nominal * 100));
        setParts.push(`nominal = $${paramIndex++}`);
        values.push(nominalCents);
      }
      if (updates.mata_uang !== undefined) {
        setParts.push(`mata_uang = $${paramIndex++}`);
        values.push(updates.mata_uang);
      }
      if (updates.tanggal_transaksi !== undefined) {
        setParts.push(`tanggal_transaksi = $${paramIndex++}`);
        values.push(updates.tanggal_transaksi);
      }
      if (updates.catatan !== undefined) {
        setParts.push(`catatan = $${paramIndex++}`);
        values.push(updates.catatan);
      }

      if (setParts.length === 0 && !updates.split_kategori) {
        throw APIError.invalidArgument("no fields to update");
      }

      let transaksi: Transaksi | null = null;

      // Get old transaction for balance revert
      const oldTransaksi = await tx.queryRow<Transaksi>`
        SELECT id, akun_id, jenis, nominal
        FROM transaksi
        WHERE id = ${id} AND dihapus_pada IS NULL
      `;

      if (!oldTransaksi) {
        throw APIError.notFound("transaction not found");
      }

      if (setParts.length > 0) {
        values.push(id);
        const query = `
          UPDATE transaksi 
          SET ${setParts.join(", ")}, diubah_pada = NOW()
          WHERE id = $${paramIndex} AND dihapus_pada IS NULL
          RETURNING id, tenant_id, akun_id, kategori_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id, transaksi_berulang_id, dibuat_pada, diubah_pada
        `;

        transaksi = await tx.rawQueryRow<Transaksi>(query, ...values);
      } else {
        // Just get the existing transaction if only updating splits
        transaksi = await tx.queryRow<Transaksi>`
          SELECT id, tenant_id, akun_id, kategori_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id, transaksi_berulang_id, dibuat_pada, diubah_pada
          FROM transaksi
          WHERE id = ${id} AND dihapus_pada IS NULL
        `;
      }

      if (!transaksi) {
        throw APIError.notFound("transaction not found");
      }

      // Update split categories if provided
      if (updates.split_kategori !== undefined) {
        // Delete existing splits
        await tx.exec`DELETE FROM detail_transaksi_split WHERE transaksi_id = ${id}`;

        // Insert new splits
        for (const split of updates.split_kategori) {
          const splitCents = BigInt(Math.round(split.nominal_split * 100));
          await tx.exec`
            INSERT INTO detail_transaksi_split (transaksi_id, kategori_id, nominal_split)
            VALUES (${id}, ${split.kategori_id}, ${splitCents})
          `;
        }
        transaksi.split_kategori = updates.split_kategori;
      } else {
        // Get existing splits and convert from cents
        const splits = await tx.queryAll<SplitKategori>`
          SELECT kategori_id, nominal_split
          FROM detail_transaksi_split
          WHERE transaksi_id = ${id}
        `;
        if (splits.length > 0) {
          transaksi.split_kategori = splits.map((s) => ({
            ...s,
            nominal_split: Number(s.nominal_split) / 100,
          }));
        }
      }

      // Update account balance within transaction for atomicity
      // Revert old transaction
      if (oldTransaksi.jenis === "pemasukan") {
        await tx.exec`UPDATE akun SET saldo_terkini = safe_bigint_subtract(saldo_terkini, ${oldTransaksi.nominal}) WHERE id = ${oldTransaksi.akun_id}`;
      } else if (oldTransaksi.jenis === "pengeluaran") {
        await tx.exec`UPDATE akun SET saldo_terkini = safe_bigint_add(saldo_terkini, ${oldTransaksi.nominal}) WHERE id = ${oldTransaksi.akun_id}`;
      }

      // Apply new transaction
      if (transaksi.jenis === "pemasukan") {
        await tx.exec`UPDATE akun SET saldo_terkini = safe_bigint_add(saldo_terkini, ${transaksi.nominal}) WHERE id = ${transaksi.akun_id}`;
      } else if (transaksi.jenis === "pengeluaran") {
        await tx.exec`UPDATE akun SET saldo_terkini = safe_bigint_subtract(saldo_terkini, ${transaksi.nominal}) WHERE id = ${transaksi.akun_id}`;
      }

      await tx.commit();

      // Convert nominal from cents
      return {
        ...transaksi,
        nominal: Number(transaksi.nominal) / 100,
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);
