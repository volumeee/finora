import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { kategoriDB } from "./db";
import { Kategori } from "./create";

interface ListKategoriParams {
  tenant_id: Query<string>;
  include_system?: Query<boolean>;
  parent_only?: Query<boolean>;
  limit?: Query<number>;
  offset?: Query<number>;
}

interface ListKategoriResponse {
  kategori: Kategori[];
  total: number;
}

// Retrieves all categories for a tenant, including system defaults.
export const list = api<ListKategoriParams, ListKategoriResponse>(
  { expose: true, method: "GET", path: "/kategori" },
  async ({ tenant_id, include_system = true, parent_only = false, limit = 100, offset = 0 }) => {
    let query = `
      SELECT id, tenant_id, nama_kategori, warna, ikon, kategori_induk_id, sistem_bawaan, dibuat_pada, diubah_pada
      FROM kategori
      WHERE dihapus_pada IS NULL
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (include_system) {
      query += ` AND (tenant_id = $${paramIndex++} OR sistem_bawaan = true)`;
      params.push(tenant_id);
    } else {
      query += ` AND tenant_id = $${paramIndex++}`;
      params.push(tenant_id);
    }
    
    if (parent_only) {
      query += ` AND kategori_induk_id IS NULL`;
    }
    
    query += ` ORDER BY sistem_bawaan DESC, nama_kategori ASC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);
    
    const kategori = await kategoriDB.rawQueryAll<Kategori>(query, ...params);
    
    let countQuery = `
      SELECT COUNT(*) as count
      FROM kategori
      WHERE dihapus_pada IS NULL
    `;
    
    const countParams: any[] = [];
    let countParamIndex = 1;
    
    if (include_system) {
      countQuery += ` AND (tenant_id = $${countParamIndex++} OR sistem_bawaan = true)`;
      countParams.push(tenant_id);
    } else {
      countQuery += ` AND tenant_id = $${countParamIndex++}`;
      countParams.push(tenant_id);
    }
    
    if (parent_only) {
      countQuery += ` AND kategori_induk_id IS NULL`;
    }
    
    const countRow = await kategoriDB.rawQueryRow<{ count: number }>(countQuery, ...countParams);
    
    return {
      kategori,
      total: countRow?.count || 0
    };
  }
);
