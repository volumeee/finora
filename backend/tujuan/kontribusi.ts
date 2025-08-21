import { api, APIError } from "encore.dev/api";
import { tujuanDB } from "./db";

export interface CreateKontribusiRequest {
  tujuan_tabungan_id: string;
  transaksi_id: string;
  nominal_kontribusi: number;
  tanggal_kontribusi: string;
}

export interface Kontribusi {
  id: string;
  tujuan_tabungan_id: string;
  transaksi_id: string;
  nominal_kontribusi: number;
  tanggal_kontribusi: string;
}

// Creates a contribution to a savings goal.
export const createKontribusi = api<CreateKontribusiRequest, Kontribusi>(
  { expose: true, method: "POST", path: "/tujuan/kontribusi" },
  async (req) => {
    // Convert to cents for database
    const nominalCents = Math.round(req.nominal_kontribusi * 100);
    
    const row = await tujuanDB.queryRow<Kontribusi>`
      INSERT INTO kontribusi_tujuan (tujuan_tabungan_id, transaksi_id, nominal_kontribusi, tanggal_kontribusi)
      VALUES (${req.tujuan_tabungan_id}, ${req.transaksi_id}, ${nominalCents}, ${req.tanggal_kontribusi})
      RETURNING id, tujuan_tabungan_id, transaksi_id, nominal_kontribusi, tanggal_kontribusi
    `;
    
    if (!row) {
      throw new Error("Failed to create contribution");
    }
    
    // Convert back from cents
    return {
      ...row,
      nominal_kontribusi: row.nominal_kontribusi / 100,
    };
  }
);

interface ListKontribusiParams {
  tujuan_id: string;
}

interface ListKontribusiResponse {
  kontribusi: Kontribusi[];
}

// Retrieves all contributions for a savings goal.
export const listKontribusi = api<ListKontribusiParams, ListKontribusiResponse>(
  { expose: true, method: "GET", path: "/tujuan/:tujuan_id/kontribusi" },
  async ({ tujuan_id }) => {
    const rows = await tujuanDB.queryAll<Kontribusi>`
      SELECT id, tujuan_tabungan_id, transaksi_id, nominal_kontribusi, tanggal_kontribusi
      FROM kontribusi_tujuan
      WHERE tujuan_tabungan_id = ${tujuan_id}
      ORDER BY tanggal_kontribusi DESC
    `;
    
    // Convert from cents
    const kontribusi = rows.map(row => ({
      ...row,
      nominal_kontribusi: row.nominal_kontribusi / 100,
    }));
    
    return { kontribusi };
  }
);

interface DeleteKontribusiParams {
  id: string;
}

// Deletes a contribution.
export const deleteKontribusi = api<DeleteKontribusiParams, void>(
  { expose: true, method: "DELETE", path: "/tujuan/kontribusi/:id" },
  async ({ id }) => {
    await tujuanDB.exec`
      DELETE FROM kontribusi_tujuan WHERE id = ${id}
    `;
  }
);
