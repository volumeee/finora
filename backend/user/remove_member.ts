import { api, APIError } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const tenantDB = SQLDatabase.named("tenant");

export interface RemoveMemberRequest {
  tenant_id: string;
  pengguna_id: string;
  removed_by: string;
}

// Removes a user from a tenant.
export const removeMember = api<RemoveMemberRequest, void>(
  { expose: true, method: "DELETE", path: "/user/member" },
  async (req) => {
    // Check if remover has permission
    const removerRole = await tenantDB.queryRow<{ peran_id: number }>`
      SELECT peran_id
      FROM pengguna_tenant
      WHERE tenant_id = ${req.tenant_id} AND pengguna_id = ${req.removed_by}
    `;
    
    if (!removerRole || removerRole.peran_id > 2) { // Only owner and admin can remove members
      throw APIError.permissionDenied("insufficient permissions to remove users");
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
    
    // Prevent removing owners (unless self-removal)
    if (targetUser.peran_id === 1 && req.pengguna_id !== req.removed_by) {
      throw APIError.permissionDenied("cannot remove owner from tenant");
    }
    
    // Prevent non-owners from removing other admins
    if (targetUser.peran_id === 2 && removerRole.peran_id !== 1 && req.pengguna_id !== req.removed_by) {
      throw APIError.permissionDenied("only owners can remove admins");
    }
    
    // Remove user from tenant
    await tenantDB.exec`
      DELETE FROM pengguna_tenant
      WHERE tenant_id = ${req.tenant_id} AND pengguna_id = ${req.pengguna_id}
    `;
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
