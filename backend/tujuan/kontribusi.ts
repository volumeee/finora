import { api, APIError } from "encore.dev/api";
import { tujuanDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { updateBalance } from "../akun/update_balance";

const akunDB = SQLDatabase.named("akun");
const transaksiDB = SQLDatabase.named("transaksi");

export interface CreateKontribusiRequest {
  tujuan_tabungan_id: string;
  akun_id: string;
  nominal_kontribusi: number;
  tanggal_kontribusi: string;
  catatan?: string;
}

export interface Kontribusi {
  id: string;
  tujuan_tabungan_id: string;
  transaksi_id: string;
  akun_id: string;
  nominal_kontribusi: number;
  tanggal_kontribusi: string;
  catatan?: string;
  nama_akun?: string;
  nama_tujuan?: string;
  source_type?: string;
}

// Creates a contribution to a savings goal.
export const createKontribusi = api<CreateKontribusiRequest, Kontribusi>(
  { expose: true, method: "POST", path: "/tujuan/kontribusi" },
  async (req) => {
    const nominalCents = Math.round(req.nominal_kontribusi * 100);
    
    // Validate goal exists
    const goal = await tujuanDB.queryRow`
      SELECT id, tenant_id FROM tujuan_tabungan 
      WHERE id = ${req.tujuan_tabungan_id} AND dihapus_pada IS NULL
    `;
    
    if (!goal) {
      throw new APIError(400, "Tujuan tabungan tidak ditemukan");
    }
    
    // Validate account exists and has sufficient balance
    const account = await akunDB.queryRow<{id: string, saldo_terkini: string, tenant_id: string}>`
      SELECT id, saldo_terkini::text, tenant_id FROM akun 
      WHERE id = ${req.akun_id} AND dihapus_pada IS NULL
    `;
    
    if (!account) {
      throw new APIError(400, "Akun tidak ditemukan");
    }
    
    if (account.tenant_id !== goal.tenant_id) {
      throw new APIError(400, "Akun dan tujuan harus dalam tenant yang sama");
    }
    
    const currentBalance = parseInt(account.saldo_terkini);
    if (currentBalance < nominalCents) {
      throw new APIError(400, "Saldo tidak mencukupi");
    }
    
    const tx = await tujuanDB.begin();
    
    try {
      // Create transaction record
      const transaksi = await transaksiDB.queryRow`
        INSERT INTO transaksi (tenant_id, akun_id, jenis, nominal, mata_uang, tanggal_transaksi, catatan, pengguna_id)
        VALUES (${goal.tenant_id}, ${req.akun_id}, 'transfer', ${nominalCents}, 'IDR', ${req.tanggal_kontribusi}, ${req.catatan || 'Kontribusi tujuan tabungan'}, ${goal.tenant_id})
        RETURNING id
      `;
      
      if (!transaksi) {
        throw new Error("Gagal membuat transaksi");
      }
      
      // Create contribution record
      const row = await tx.queryRow<Kontribusi>`
        INSERT INTO kontribusi_tujuan (tujuan_tabungan_id, transaksi_id, akun_id, nominal_kontribusi, tanggal_kontribusi, catatan)
        VALUES (${req.tujuan_tabungan_id}, ${transaksi.id}, ${req.akun_id}, ${nominalCents}, ${req.tanggal_kontribusi}, ${req.catatan || null})
        RETURNING id, tujuan_tabungan_id, transaksi_id, akun_id, nominal_kontribusi, tanggal_kontribusi, catatan
      `;
      
      if (!row) {
        throw new Error("Gagal membuat kontribusi");
      }
      
      await tx.commit();
      
      // Update account balance
      await updateBalance({
        akun_id: req.akun_id,
        amount: nominalCents,
        operation: "subtract"
      });
      
      return {
        ...row,
        nominal_kontribusi: row.nominal_kontribusi / 100,
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

interface ListKontribusiParams {
  tujuan_id: string;
}

interface ListKontribusiResponse {
  kontribusi: Kontribusi[];
}

// Retrieves all contributions for a savings goal from all sources.
export const listKontribusi = api<ListKontribusiParams, ListKontribusiResponse>(
  { expose: true, method: "GET", path: "/tujuan/:tujuan_id/kontribusi" },
  async ({ tujuan_id }) => {
    const rows = await tujuanDB.queryAll<Kontribusi>`
      SELECT 
        kt.id, kt.tujuan_tabungan_id, kt.transaksi_id, kt.akun_id,
        kt.nominal_kontribusi, kt.tanggal_kontribusi, kt.catatan,
        t.nama_tujuan
      FROM kontribusi_tujuan kt
      LEFT JOIN tujuan_tabungan t ON kt.tujuan_tabungan_id = t.id
      WHERE kt.tujuan_tabungan_id = ${tujuan_id}
      ORDER BY kt.tanggal_kontribusi DESC
    `;
    
    const kontribusiWithNames = [];
    for (const row of rows) {
      let nama_akun = 'Akun tidak diketahui';
      let akun_id = row.akun_id;
      let source_type = 'direct';
      
      // Get transaction details to determine source
      if (row.transaksi_id) {
        try {
          const transaction = await transaksiDB.queryRow<{akun_id: string, jenis: string}>`
            SELECT akun_id, jenis FROM transaksi WHERE id = ${row.transaksi_id}
          `;
          if (transaction) {
            akun_id = transaction.akun_id;
            source_type = transaction.jenis === 'transfer' ? 'transfer' : 'direct';
          }
        } catch (error) {
          console.error('Failed to get transaction details:', error);
        }
      }
      
      // Get account name
      if (akun_id) {
        try {
          const account = await akunDB.queryRow<{nama_akun: string}>`
            SELECT nama_akun FROM akun WHERE id = ${akun_id}
          `;
          if (account) {
            nama_akun = account.nama_akun;
          }
        } catch (error) {
          console.error('Failed to get account name:', error);
        }
      }
      
      kontribusiWithNames.push({
        ...row,
        akun_id,
        nama_akun,
        nominal_kontribusi: row.nominal_kontribusi / 100,
        source_type
      });
    }
    
    return { kontribusi: kontribusiWithNames };
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

interface ListAllKontribusiParams {
  tenant_id: string;
  limit?: number;
  offset?: number;
}

interface ListAllKontribusiResponse {
  kontribusi: Kontribusi[];
  total: number;
}

// Retrieves all contributions for a tenant with detailed information from all sources.
export const listAllKontribusi = api<ListAllKontribusiParams, ListAllKontribusiResponse>(
  { expose: true, method: "GET", path: "/tujuan/kontribusi" },
  async ({ tenant_id, limit = 50, offset = 0 }) => {
    // Get all contributions from kontribusi_tujuan table
    const directContributions = await tujuanDB.queryAll<Kontribusi>`
      SELECT 
        kt.id, kt.tujuan_tabungan_id, kt.transaksi_id, kt.akun_id,
        kt.nominal_kontribusi, kt.tanggal_kontribusi, kt.catatan,
        t.nama_tujuan, 'direct' as source_type
      FROM kontribusi_tujuan kt
      LEFT JOIN tujuan_tabungan t ON kt.tujuan_tabungan_id = t.id
      WHERE t.tenant_id = ${tenant_id}
    `;
    
    // Get all transfer transactions to goals from transaksi database
    const transferContributions = await transaksiDB.queryAll<any>`
      SELECT DISTINCT
        tr.id as transaksi_id,
        tr.akun_id,
        tr.nominal,
        tr.tanggal_transaksi,
        tr.catatan,
        'transfer' as source_type
      FROM transaksi tr
      WHERE tr.tenant_id = ${tenant_id} 
        AND tr.jenis = 'transfer'
        AND tr.dihapus_pada IS NULL
        AND EXISTS (
          SELECT 1 FROM kontribusi_tujuan kt 
          WHERE kt.transaksi_id = tr.id
        )
    `;
    
    // Combine and process all contributions
    const allContributions = [];
    
    // Process direct contributions
    for (const row of directContributions) {
      let nama_akun = 'Akun tidak diketahui';
      let akun_id = row.akun_id;
      
      // Get akun_id from transaction if null
      if (!akun_id && row.transaksi_id) {
        try {
          const transaction = await transaksiDB.queryRow<{akun_id: string}>`
            SELECT akun_id FROM transaksi WHERE id = ${row.transaksi_id}
          `;
          if (transaction) {
            akun_id = transaction.akun_id;
          }
        } catch (error) {
          console.error('Failed to get transaction akun_id:', error);
        }
      }
      
      // Get account name
      if (akun_id) {
        try {
          const account = await akunDB.queryRow<{nama_akun: string}>`
            SELECT nama_akun FROM akun WHERE id = ${akun_id}
          `;
          if (account) {
            nama_akun = account.nama_akun;
          }
        } catch (error) {
          console.error('Failed to get account name:', error);
        }
      }
      
      allContributions.push({
        ...row,
        akun_id,
        nama_akun,
        nominal_kontribusi: row.nominal_kontribusi / 100,
        source_type: 'direct'
      });
    }
    
    // Process transfer contributions (get goal info)
    for (const transfer of transferContributions) {
      let nama_akun = 'Akun tidak diketahui';
      
      // Get account name
      if (transfer.akun_id) {
        try {
          const account = await akunDB.queryRow<{nama_akun: string}>`
            SELECT nama_akun FROM akun WHERE id = ${transfer.akun_id}
          `;
          if (account) {
            nama_akun = account.nama_akun;
          }
        } catch (error) {
          console.error('Failed to get account name:', error);
        }
      }
      
      // Get goal info from kontribusi_tujuan
      const goalInfo = await tujuanDB.queryRow<{tujuan_tabungan_id: string, nama_tujuan: string, id: string}>`
        SELECT kt.tujuan_tabungan_id, t.nama_tujuan, kt.id
        FROM kontribusi_tujuan kt
        LEFT JOIN tujuan_tabungan t ON kt.tujuan_tabungan_id = t.id
        WHERE kt.transaksi_id = ${transfer.transaksi_id}
      `;
      
      if (goalInfo) {
        allContributions.push({
          id: goalInfo.id,
          tujuan_tabungan_id: goalInfo.tujuan_tabungan_id,
          transaksi_id: transfer.transaksi_id,
          akun_id: transfer.akun_id,
          nominal_kontribusi: transfer.nominal / 100,
          tanggal_kontribusi: transfer.tanggal_transaksi,
          catatan: transfer.catatan,
          nama_akun,
          nama_tujuan: goalInfo.nama_tujuan,
          source_type: 'transfer'
        });
      }
    }
    
    // Sort by date and apply pagination
    allContributions.sort((a, b) => new Date(b.tanggal_kontribusi).getTime() - new Date(a.tanggal_kontribusi).getTime());
    const paginatedContributions = allContributions.slice(offset, offset + limit);
    
    return { 
      kontribusi: paginatedContributions,
      total: allContributions.length
    };
  }
);
