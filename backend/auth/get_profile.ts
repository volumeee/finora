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
}

// Gets user profile information.
export const getProfile = api<GetProfileRequest, UserProfile>(
  { expose: true, method: "GET", path: "/auth/profile" },
  async (req) => {
    const userId = extractUserIdFromToken(req.authorization);
    
    const row = await tenantDB.queryRow<UserProfile>`
      SELECT id, nama_lengkap, email, no_telepon, avatar_url, dibuat_pada, diubah_pada
      FROM pengguna
      WHERE id = ${userId} AND dihapus_pada IS NULL
    `;
    
    if (!row) {
      throw APIError.notFound("user not found");
    }
    
    return row;
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