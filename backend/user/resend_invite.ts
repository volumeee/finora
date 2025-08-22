import { api, APIError } from "encore.dev/api";
import { Header } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as crypto from "crypto";

const authDB = SQLDatabase.named("auth");
const tenantDB = SQLDatabase.named("tenant");

interface ResendInviteRequest {
  invite_id: string;
  tenant_id: string;
  authorization: Header<"Authorization">;
}

interface ResendInviteResponse {
  id: string;
  email: string;
  token: string;
  kedaluwarsa: Date;
}

// Resends a pending invitation with new token and expiry.
export const resendInvite = api<ResendInviteRequest, ResendInviteResponse>(
  { expose: true, method: "POST", path: "/user/invite/resend" },
  async (req) => {
    const userId = extractUserIdFromToken(req.authorization);
    
    // Check if user has permission to resend invites
    const userTenant = await tenantDB.queryRow<{ peran_id: number }>`
      SELECT peran_id
      FROM pengguna_tenant
      WHERE tenant_id = ${req.tenant_id} AND pengguna_id = ${userId}
    `;
    
    if (!userTenant || userTenant.peran_id > 2) { // Only owner and admin can resend invites
      throw APIError.permissionDenied("insufficient permissions to resend invitations");
    }
    
    // Verify invite exists and belongs to tenant
    const invite = await authDB.queryRow<{ id: string; email: string }>`
      SELECT id, email
      FROM undangan
      WHERE id = ${req.invite_id} AND tenant_id = ${req.tenant_id} AND diterima_pada IS NULL
    `;
    
    if (!invite) {
      throw APIError.notFound("invitation not found or already accepted");
    }
    
    // Generate new token and expiry
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Update invitation with new token and expiry
    const updatedInvite = await authDB.queryRow<ResendInviteResponse>`
      UPDATE undangan
      SET token = ${newToken}, kedaluwarsa = ${newExpiry}
      WHERE id = ${req.invite_id}
      RETURNING id, email, token, kedaluwarsa
    `;
    
    if (!updatedInvite) {
      throw new Error("Failed to update invitation");
    }
    
    // TODO: Send email notification
    
    return updatedInvite;
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