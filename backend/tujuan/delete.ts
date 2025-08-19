import { api } from "encore.dev/api";
import { tujuanDB } from "./db";

interface DeleteTujuanParams {
  id: string;
}

// Soft deletes a savings goal.
export const deleteTujuan = api<DeleteTujuanParams, void>(
  { expose: true, method: "DELETE", path: "/tujuan/:id" },
  async ({ id }) => {
    await tujuanDB.exec`
      UPDATE tujuan_tabungan 
      SET dihapus_pada = NOW()
      WHERE id = ${id} AND dihapus_pada IS NULL
    `;
  }
);
