import { api, APIError } from "encore.dev/api";
import { Header } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as crypto from "crypto";

const tenantDB = SQLDatabase.named("tenant");

interface GetProfileRequest {
  authorization: Header<"Authorization">;
}

interface UserProfile {
  id: string;
  nama_lengkap: string;
  email: string;
  no_telepon?: string;
  avatar_url?: string;
  dibuat_pada: Date;
  diubah_pada: Date;
  tenants: {
    id: string;
    nama: string;
    sub_domain: string;
    peran: string;
  }[];
}

// Gets user profile information.
export const getProfile = api<GetProfileRequest, UserProfile>(
  { expose: true, method: "GET", path: "/auth/profile" },
  async (req) => {
    const userId = extractUserIdFromToken(req.authorization);
    
    const user = await tenantDB.queryRow<{
      id: string;
      nama_lengkap: string;
      email: string;
      no_telepon?: string;
      avatar_url?: string;
      dibuat_pada: Date;
      diubah_pada: Date;
    }>`
      SELECT id, nama_lengkap, email, no_telepon, avatar_url, dibuat_pada, diubah_pada
      FROM pengguna
      WHERE id = ${userId} AND dihapus_pada IS NULL
    `;
    
    if (!user) {
      throw APIError.notFound("user not found");
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
      WHERE pt.pengguna_id = ${userId} AND t.dihapus_pada IS NULL
      ORDER BY pt.bergabung_pada ASC
    `;
    
    return {
      ...user,
      tenants
    };
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