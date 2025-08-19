import { api } from "encore.dev/api";
import { transaksiDB } from "./db";

interface DeleteTransaksiParams {
  id: string;
}

// Soft deletes a transaction.
export const deleteTransaksi = api<DeleteTransaksiParams, void>(
  { expose: true, method: "DELETE", path: "/transaksi/:id" },
  async ({ id }) => {
    const tx = await transaksiDB.begin();
    
    try {
      // Soft delete the transaction
      await tx.exec`
        UPDATE transaksi 
        SET dihapus_pada = NOW()
        WHERE id = ${id} AND dihapus_pada IS NULL
      `;
      
      // Delete split categories (hard delete since they're dependent)
      await tx.exec`DELETE FROM detail_transaksi_split WHERE transaksi_id = ${id}`;
      
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);
