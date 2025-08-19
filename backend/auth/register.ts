import { api, APIError } from "encore.dev/api";
import { authDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as bcrypt from "bcrypt";

const tenantDB = SQLDatabase.named("tenant");

export interface RegisterRequest {
  nama_lengkap: string;
  email: string;
  kata_sandi: string;
  nama_tenant: string;
  sub_domain: string;
  no_telepon?: string;
}

export interface RegisterResponse {
  pengguna: {
    id: string;
    nama_lengkap: string;
    email: string;
    no_telepon?: string;
  };
  tenant: {
    id: string;
    nama: string;
    sub_domain: string;
  };
  access_token: string;
  refresh_token: string;
}

// Registers a new user and creates their tenant.
export const register = api<RegisterRequest, RegisterResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
    const tx = await authDB.begin();
    
    try {
      // Check if email already exists
      const existingUser = await tx.queryRow<{ id: string }>`
        SELECT id FROM pengguna WHERE email = ${req.email}
      `;
      
      if (existingUser) {
        throw APIError.alreadyExists("email already registered");
      }
      
      // Check if subdomain already exists
      const existingTenant = await tenantDB.queryRow<{ id: string }>`
        SELECT id FROM tenants WHERE sub_domain = ${req.sub_domain}
      `;
      
      if (existingTenant) {
        throw APIError.alreadyExists("subdomain already taken");
      }
      
      // Hash password
      const kataSandiHash = await bcrypt.hash(req.kata_sandi, 10);
      
      // Create user
      const pengguna = await tx.queryRow<{
        id: string;
        nama_lengkap: string;
        email: string;
        no_telepon?: string;
      }>`
        INSERT INTO pengguna (nama_lengkap, email, kata_sandi_hash, no_telepon)
        VALUES (${req.nama_lengkap}, ${req.email}, ${kataSandiHash}, ${req.no_telepon})
        RETURNING id, nama_lengkap, email, no_telepon
      `;
      
      if (!pengguna) {
        throw new Error("Failed to create user");
      }
      
      // Create tenant
      const tenant = await tenantDB.queryRow<{
        id: string;
        nama: string;
        sub_domain: string;
      }>`
        INSERT INTO tenants (nama, sub_domain)
        VALUES (${req.nama_tenant}, ${req.sub_domain})
        RETURNING id, nama, sub_domain
      `;
      
      if (!tenant) {
        throw new Error("Failed to create tenant");
      }
      
      // Add user to tenant as owner
      await tenantDB.exec`
        INSERT INTO pengguna_tenant (tenant_id, pengguna_id, peran_id)
        VALUES (${tenant.id}, ${pengguna.id}, 1)
      `;
      
      // Generate tokens
      const accessToken = generateAccessToken(pengguna.id);
      const refreshToken = generateRefreshToken();
      const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
      
      // Store refresh token
      await tx.exec`
        INSERT INTO sesi_login (pengguna_id, refresh_token_hash, kedaluwarsa)
        VALUES (${pengguna.id}, ${refreshTokenHash}, NOW() + INTERVAL '30 days')
      `;
      
      await tx.commit();
      
      return {
        pengguna,
        tenant,
        access_token: accessToken,
        refresh_token: refreshToken
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

function generateAccessToken(userId: string): string {
  // In production, use proper JWT library
  return `access_${userId}_${Date.now()}`;
}

function generateRefreshToken(): string {
  // In production, use crypto.randomBytes
  return `refresh_${Math.random().toString(36).substring(2)}_${Date.now()}`;
}
