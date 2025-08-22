import { api, APIError } from "encore.dev/api";
import { Query, Header } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as crypto from "crypto";

const tenantDB = SQLDatabase.named("tenant");

export interface TenantMember {
  id: string;
  nama_lengkap: string;
  email: string;
  avatar_url?: string;
  peran_id: number;
  nama_peran: string;
  bergabung_pada: Date;
}

interface ListMembersParams {
  tenant_id: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
  authorization: Header<"Authorization">;
}

interface ListMembersResponse {
  members: TenantMember[];
  total: number;
}

// Retrieves all members of a tenant.
export const listMembers = api<ListMembersParams, ListMembersResponse>(
  { expose: true, method: "GET", path: "/user/members" },
  async ({ tenant_id, limit = 50, offset = 0, authorization }) => {
    const userId = extractUserIdFromToken(authorization);
    
    // Check if user has access to this tenant
    const userTenant = await tenantDB.queryRow<{ peran_id: number }>`
      SELECT peran_id
      FROM pengguna_tenant
      WHERE tenant_id = ${tenant_id} AND pengguna_id = ${userId}
    `;
    
    if (!userTenant) {
      throw APIError.permissionDenied("access denied to tenant members");
    }
    const members = await tenantDB.queryAll<TenantMember>`
      SELECT 
        p.id,
        p.nama_lengkap,
        p.email,
        p.avatar_url,
        pt.peran_id,
        pr.nama_peran,
        pt.bergabung_pada
      FROM pengguna_tenant pt
      JOIN pengguna p ON pt.pengguna_id = p.id
      JOIN peran pr ON pt.peran_id = pr.id
      WHERE pt.tenant_id = ${tenant_id} AND p.dihapus_pada IS NULL
      ORDER BY pt.peran_id ASC, pt.bergabung_pada ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    const countRow = await tenantDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count
      FROM pengguna_tenant pt
      JOIN pengguna p ON pt.pengguna_id = p.id
      WHERE pt.tenant_id = ${tenant_id} AND p.dihapus_pada IS NULL
    `;
    
    return {
      members,
      total: countRow?.count || 0
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
