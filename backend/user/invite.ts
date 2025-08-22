import { api, APIError } from "encore.dev/api";
import { Header } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as crypto from "crypto";

const authDB = SQLDatabase.named("auth");
const tenantDB = SQLDatabase.named("tenant");

export interface InviteUserRequest {
  tenant_id: string;
  email: string;
  peran_id: number;
  authorization: Header<"Authorization">;
}

export interface InviteUserResponse {
  id: string;
  email: string;
  peran_id: number;
  token: string;
  kedaluwarsa: Date;
}

// Invites a user to join a tenant.
export const inviteUser = api<InviteUserRequest, InviteUserResponse>(
  { expose: true, method: "POST", path: "/user/invite" },
  async (req) => {
    const userId = extractUserIdFromToken(req.authorization);
    
    // Check if user has permission to invite
    const userTenant = await tenantDB.queryRow<{ peran_id: number }>`
      SELECT peran_id
      FROM pengguna_tenant
      WHERE tenant_id = ${req.tenant_id} AND pengguna_id = ${userId}
    `;
    
    if (!userTenant || userTenant.peran_id > 2) { // Only owner and admin can invite
      throw APIError.permissionDenied("insufficient permissions to invite users");
    }
    
    // Check if user is already a member (case-insensitive)
    const normalizedEmail = req.email.toLowerCase();
    const existingMember = await tenantDB.queryRow<{ id: string }>`
      SELECT pt.id
      FROM pengguna_tenant pt
      JOIN pengguna p ON pt.pengguna_id = p.id
      WHERE pt.tenant_id = ${req.tenant_id} AND LOWER(p.email) = ${normalizedEmail}
    `;
    
    if (existingMember) {
      throw APIError.alreadyExists("user is already a member of this tenant");
    }
    
    // Check if there's already a pending invitation (case-insensitive)
    const existingInvite = await authDB.queryRow<{ id: string }>`
      SELECT id
      FROM undangan
      WHERE tenant_id = ${req.tenant_id} AND LOWER(email) = ${normalizedEmail} AND diterima_pada IS NULL AND kedaluwarsa > NOW()
    `;
    
    if (existingInvite) {
      throw APIError.alreadyExists("invitation already sent to this email");
    }
    
    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const kedaluwarsa = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Create invitation
    const invitation = await authDB.queryRow<InviteUserResponse>`
      INSERT INTO undangan (tenant_id, email, peran_id, token, diundang_oleh, kedaluwarsa)
      VALUES (${req.tenant_id}, ${normalizedEmail}, ${req.peran_id}, ${token}, ${userId}, ${kedaluwarsa})
      RETURNING id, email, peran_id, token, kedaluwarsa
    `;
    
    if (!invitation) {
      throw new Error("Failed to create invitation");
    }
    
    // TODO: Send email notification
    
    return invitation;
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
