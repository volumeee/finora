import { api } from "encore.dev/api";
import { akunDB } from "./db";

interface DeleteAkunParams {
  id: string;
}

// Soft deletes an account.
export const deleteAkun = api<DeleteAkunParams, void>(
  { expose: true, method: "DELETE", path: "/akun/:id" },
  async ({ id }) => {
    await akunDB.exec`
      UPDATE akun 
      SET dihapus_pada = NOW()
      WHERE id = ${id} AND dihapus_pada IS NULL
    `;
  }
);
