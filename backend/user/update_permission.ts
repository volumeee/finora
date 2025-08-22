import { api, APIError } from "encore.dev/api";
import { Header } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as crypto from "crypto";

const tenantDB = SQLDatabase.named("tenant");

export interface UpdatePermissionRequest {
  tenant_id: string;
  pengguna_id: string;
  peran_id: number;
  authorization: Header<"Authorization">;
}

export interface UpdatePermissionResponse {
  id: string;
  nama_lengkap: string;
  email: string;
  peran_id: number;
  nama_peran: string;
}

// Updates a user's permission/role in a tenant.
export const updatePermission = api<UpdatePermissionRequest, UpdatePermissionResponse>(
  { expose: true, method: "PUT", path: "/user/permission" },
  async (req) => {
    const userId = extractUserIdFromToken(req.authorization);
    
    // Check if updater has permission
    const updaterRole = await tenantDB.queryRow<{ peran_id: number }>`
      SELECT peran_id
      FROM pengguna_tenant
      WHERE tenant_id = ${req.tenant_id} AND pengguna_id = ${userId}
    `;
    
    if (!updaterRole || updaterRole.peran_id > 2) { // Only owner and admin can update permissions
      throw APIError.permissionDenied("insufficient permissions to update user roles");
    }
    
    // Check if target user exists in tenant
    const targetUser = await tenantDB.queryRow<{ peran_id: number }>`
      SELECT peran_id
      FROM pengguna_tenant
      WHERE tenant_id = ${req.tenant_id} AND pengguna_id = ${req.pengguna_id}
    `;
    
    if (!targetUser) {
      throw APIError.notFound("user not found in tenant");
    }
    
    // Prevent non-owners from changing owner role
    if (targetUser.peran_id === 1 && updaterRole.peran_id !== 1) {
      throw APIError.permissionDenied("only owners can change owner permissions");
    }
    
    // Prevent non-owners from setting owner role
    if (req.peran_id === 1 && updaterRole.peran_id !== 1) {
      throw APIError.permissionDenied("only owners can assign owner role");
    }
    
    // Update permission
    await tenantDB.exec`
      UPDATE pengguna_tenant
      SET peran_id = ${req.peran_id}
      WHERE tenant_id = ${req.tenant_id} AND pengguna_id = ${req.pengguna_id}
    `;
    
    // Get updated user info
    const updatedUser = await tenantDB.queryRow<UpdatePermissionResponse>`
      SELECT 
        p.id,
        p.nama_lengkap,
        p.email,
        pt.peran_id,
        pr.nama_peran
      FROM pengguna_tenant pt
      JOIN pengguna p ON pt.pengguna_id = p.id
      JOIN peran pr ON pt.peran_id = pr.id
      WHERE pt.tenant_id = ${req.tenant_id} AND pt.pengguna_id = ${req.pengguna_id}
    `;
    
    if (!updatedUser) {
      throw new Error("Failed to get updated user info");
    }
    
    return updatedUser;
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
