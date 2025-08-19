import { api, APIError } from "encore.dev/api";
import { authDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as bcrypt from "bcrypt";

const tenantDB = SQLDatabase.named("tenant");

export interface LoginRequest {
  email: string;
  kata_sandi: string;
}

export interface LoginResponse {
  pengguna: {
    id: string;
    nama_lengkap: string;
    email: string;
    avatar_url?: string;
    no_telepon?: string;
  };
  tenants: {
    id: string;
    nama: string;
    sub_domain: string;
    peran: string;
  }[];
  access_token: string;
  refresh_token: string;
}

// Authenticates a user and returns their profile with tenants.
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    // Get user by email
    const pengguna = await authDB.queryRow<{
      id: string;
      nama_lengkap: string;
      email: string;
      kata_sandi_hash: string;
      avatar_url?: string;
      no_telepon?: string;
    }>`
      SELECT id, nama_lengkap, email, kata_sandi_hash, avatar_url, no_telepon
      FROM pengguna
      WHERE email = ${req.email} AND dihapus_pada IS NULL
    `;
    
    if (!pengguna) {
      throw APIError.unauthenticated("invalid email or password");
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(req.kata_sandi, pengguna.kata_sandi_hash);
    if (!isValidPassword) {
      throw APIError.unauthenticated("invalid email or password");
    }
    
    // Get user's tenants
    const tenants = await tenantDB.queryAll<{
      id: string;
      nama: string;
      sub_domain: string;
      peran: string;
    }>`
      SELECT t.id, t.nama, t.sub_domain, p.nama_peran as peran
      FROM tenants t
      JOIN pengguna_tenant pt ON t.id = pt.tenant_id
      JOIN peran p ON pt.peran_id = p.id
      WHERE pt.pengguna_id = ${pengguna.id} AND t.dihapus_pada IS NULL
      ORDER BY pt.bergabung_pada ASC
    `;
    
    // Generate tokens
    const accessToken = generateAccessToken(pengguna.id);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    
    // Store refresh token
    await authDB.exec`
      INSERT INTO sesi_login (pengguna_id, refresh_token_hash, kedaluwarsa)
      VALUES (${pengguna.id}, ${refreshTokenHash}, NOW() + INTERVAL '30 days')
    `;
    
    return {
      pengguna: {
        id: pengguna.id,
        nama_lengkap: pengguna.nama_lengkap,
        email: pengguna.email,
        avatar_url: pengguna.avatar_url,
        no_telepon: pengguna.no_telepon
      },
      tenants,
      access_token: accessToken,
      refresh_token: refreshToken
    };
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
