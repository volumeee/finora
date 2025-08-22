import { api, APIError } from "encore.dev/api";
import { Query, Header } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as crypto from "crypto";

const authDB = SQLDatabase.named("auth");
const tenantDB = SQLDatabase.named("tenant");

interface CancelInviteRequest {
  invite_id: Query<string>;
  tenant_id: Query<string>;
  authorization: Header<"Authorization">;
}

// Cancels a pending invitation.
export const cancelInvite = api<CancelInviteRequest, void>(
  { expose: true, method: "DELETE", path: "/user/invite" },
  async (req) => {
    const userId = extractUserIdFromToken(req.authorization);
    
    // Check if user has permission to cancel invites
    const userTenant = await tenantDB.queryRow<{ peran_id: number }>`
      SELECT peran_id
      FROM pengguna_tenant
      WHERE tenant_id = ${req.tenant_id} AND pengguna_id = ${userId}
    `;
    
    if (!userTenant || userTenant.peran_id > 2) { // Only owner and admin can cancel invites
      throw APIError.permissionDenied("insufficient permissions to cancel invitations");
    }
    
    // Verify invite exists and belongs to tenant
    const invite = await authDB.queryRow<{ id: string }>`
      SELECT id
      FROM undangan
      WHERE id = ${req.invite_id} AND tenant_id = ${req.tenant_id} AND diterima_pada IS NULL
    `;
    
    if (!invite) {
      throw APIError.notFound("invitation not found or already accepted");
    }
    
    // Delete the invitation
    await authDB.exec`
      DELETE FROM undangan
      WHERE id = ${req.invite_id}
    `;
  }
);

function extractUserIdFromToken(authHeader: string): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw APIError.unauthenticated("missing or invalid authorization header");
  }
  
  const token = authHeader.substring(7);
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    throw APIError.unauthenticated("invalid token format");
  }
  
  try {
    const [header, payload, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', 'your-secret-key')
      .update(`${header}.${payload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      throw APIError.unauthenticated("invalid token signature");
    }
    
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      throw APIError.unauthenticated("token expired");
    }
    
    return decodedPayload.sub;
  } catch (error) {
    throw APIError.unauthenticated("invalid token");
  }
}