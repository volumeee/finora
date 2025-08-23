import { api, APIError } from "encore.dev/api";
import { authDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

const tenantDB = SQLDatabase.named("tenant");

// Role constants
const ROLE_OWNER = 1;
const ROLE_ADMIN = 2;
const ROLE_EDITOR = 3;
const ROLE_READER = 4;

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
  selected_tenant: string;
  access_token: string;
  refresh_token: string;
}

// Registers a new user and creates their tenant.
export const register = api<RegisterRequest, RegisterResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
    // Input validation
    if (!req.email || !req.email.includes('@')) {
      throw APIError.invalidArgument("valid email is required");
    }
    if (!req.kata_sandi || req.kata_sandi.length < 8) {
      throw APIError.invalidArgument("password must be at least 8 characters");
    }
    if (!req.nama_lengkap || req.nama_lengkap.trim().length === 0) {
      throw APIError.invalidArgument("full name is required");
    }
    if (!req.sub_domain || !/^[a-z0-9-]+$/.test(req.sub_domain)) {
      throw APIError.invalidArgument("subdomain must contain only lowercase letters, numbers, and hyphens");
    }
    const tenantTx = await tenantDB.begin();
    const authTx = await authDB.begin();
    
    try {
      // Check if email already exists (case-insensitive)
      const normalizedEmail = req.email.toLowerCase();
      const existingUser = await tenantTx.queryRow<{ id: string }>`
        SELECT id FROM pengguna WHERE LOWER(email) = ${normalizedEmail}
      `;
      
      if (existingUser) {
        throw APIError.alreadyExists("email already registered");
      }
      
      // Check if subdomain already exists
      const existingTenant = await tenantTx.queryRow<{ id: string }>`
        SELECT id FROM tenants WHERE sub_domain = ${req.sub_domain}
      `;
      
      if (existingTenant) {
        throw APIError.alreadyExists("subdomain already taken");
      }
      
      // Hash password
      const kataSandiHash = await bcrypt.hash(req.kata_sandi, 10);
      
      // Create user
      const pengguna = await tenantTx.queryRow<{
        id: string;
        nama_lengkap: string;
        email: string;
        no_telepon?: string;
      }>`
        INSERT INTO pengguna (nama_lengkap, email, kata_sandi_hash, no_telepon)
        VALUES (${req.nama_lengkap}, ${normalizedEmail}, ${kataSandiHash}, ${req.no_telepon})
        RETURNING id, nama_lengkap, email, no_telepon
      `;
      
      if (!pengguna) {
        throw new Error("Failed to create user");
      }
      
      // Create tenant
      const tenant = await tenantTx.queryRow<{
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
      await tenantTx.exec`
        INSERT INTO pengguna_tenant (tenant_id, pengguna_id, peran_id)
        VALUES (${tenant.id}, ${pengguna.id}, ${ROLE_OWNER})
      `;
      
      // Generate tokens
      const accessToken = generateAccessToken(pengguna.id);
      const refreshToken = generateRefreshToken();
      const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
      
      // Store refresh token
      await authTx.exec`
        INSERT INTO sesi_login (pengguna_id, refresh_token_hash, kedaluwarsa)
        VALUES (${pengguna.id}, ${refreshTokenHash}, NOW() + INTERVAL '30 days')
      `;
      
      await tenantTx.commit();
      await authTx.commit();
      
      return {
        pengguna,
        tenant,
        selected_tenant: tenant.id,
        access_token: accessToken,
        refresh_token: refreshToken
      };
    } catch (error) {
      await tenantTx.rollback();
      await authTx.rollback();
      throw error;
    }
  }
);

function generateAccessToken(userId: string): string {
  // Simple JWT-like token for demo purposes
  // In production, use proper JWT library with signing
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ 
    sub: userId, 
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', 'your-secret-key')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function generateRefreshToken(): string {
  // Use cryptographically secure random bytes
  return crypto.randomBytes(32).toString('hex');
}
