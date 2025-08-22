import { api } from "encore.dev/api";
import { transaksiDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const akunDB = SQLDatabase.named("akun");

interface DeleteTransaksiParams {
  id: string;
}

// Soft deletes a transaction.
export const deleteTransaksi = api<DeleteTransaksiParams, void>(
  { expose: true, method: "DELETE", path: "/transaksi/:id" },
  async ({ id }) => {
    const tx = await transaksiDB.begin();

    try {
      // Get transaction data before deletion for balance update
      const transaksi = await tx.queryRow<{
        akun_id: string;
        jenis: string;
        nominal: bigint;
      }>`
        SELECT akun_id, jenis, nominal
        FROM transaksi
        WHERE id = ${id} AND dihapus_pada IS NULL
      `;

      if (!transaksi) {
        return; // Already deleted or not found
      }

      // Soft delete the transaction
      await tx.exec`
        UPDATE transaksi 
        SET dihapus_pada = NOW()
        WHERE id = ${id} AND dihapus_pada IS NULL
      `;

      // Delete split categories (hard delete since they're dependent)
      await tx.exec`DELETE FROM detail_transaksi_split WHERE transaksi_id = ${id}`;

      // Revert balance update within transaction for atomicity
      if (transaksi.jenis === "pemasukan") {
        await tx.exec`UPDATE akun SET saldo_terkini = safe_bigint_subtract(saldo_terkini, ${transaksi.nominal}) WHERE id = ${transaksi.akun_id}`;
      } else if (transaksi.jenis === "pengeluaran") {
        await tx.exec`UPDATE akun SET saldo_terkini = safe_bigint_add(saldo_terkini, ${transaksi.nominal}) WHERE id = ${transaksi.akun_id}`;
      }

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);
