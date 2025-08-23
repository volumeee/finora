import { api, APIError } from "encore.dev/api";
import { Header } from "encore.dev/api";
import { tenantDB } from "./db";
import * as crypto from "crypto";

export interface CreateTenantRequest {
  authorization: Header<"Authorization">;
  nama: string;
  sub_domain: string;
  zona_waktu?: string;
  logo_url?: string;
}

export interface Tenant {
  id: string;
  nama: string;
  sub_domain: string;
  zona_waktu: string;
  logo_url?: string;
  dibuat_pada: Date;
  diubah_pada: Date;
}

// Role constants
const ROLE_OWNER = 1;

// Creates a new tenant.
export const create = api<CreateTenantRequest, Tenant>(
  { expose: true, method: "POST", path: "/tenant" },
  async (req) => {
    const userId = extractUserIdFromToken(req.authorization);
    
    // Check if subdomain already exists
    const existingTenant = await tenantDB.queryRow<{ id: string }>`
      SELECT id FROM tenants WHERE sub_domain = ${req.sub_domain}
    `;
    
    if (existingTenant) {
      throw APIError.alreadyExists("subdomain already taken");
    }
    
    const tx = await tenantDB.begin();
    
    try {
      // Create tenant
      const tenant = await tx.queryRow<Tenant>`
        INSERT INTO tenants (nama, sub_domain, zona_waktu, logo_url)
        VALUES (${req.nama}, ${req.sub_domain}, ${req.zona_waktu || 'Asia/Jakarta'}, ${req.logo_url})
        RETURNING id, nama, sub_domain, zona_waktu, logo_url, dibuat_pada, diubah_pada
      `;
      
      if (!tenant) {
        throw new Error("Failed to create tenant");
      }
      
      // Add user to tenant as owner
      await tx.exec`
        INSERT INTO pengguna_tenant (tenant_id, pengguna_id, peran_id)
        VALUES (${tenant.id}, ${userId}, ${ROLE_OWNER})
      `;
      
      await tx.commit();
      return tenant;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

function extractUserIdFromToken(authHeader: string): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw APIError.unauthenticated("missing or invalid authorization header");
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    throw APIError.unauthenticated("invalid token format");
  }
  
  try {
    // Verify signature
    const [header, payload, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', 'your-secret-key')
      .update(`${header}.${payload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      throw APIError.unauthenticated("invalid token signature");
    }
    
    // Decode payload
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    // Check expiration
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      throw APIError.unauthenticated("token expired");
    }
    
    return decodedPayload.sub;
  } catch (error) {
    throw APIError.unauthenticated("invalid token");
  }
}
