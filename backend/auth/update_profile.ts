import { api, APIError } from "encore.dev/api";
import { Header } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as crypto from "crypto";

const tenantDB = SQLDatabase.named("tenant");

interface UpdateProfileRequest {
  nama_lengkap?: string;
  email?: string;
  no_telepon?: string;
  authorization: Header<"Authorization">;
}

interface UserProfile {
  id: string;
  nama_lengkap: string;
  email: string;
  no_telepon?: string;
  diubah_pada: Date;
}

// Updates user profile information.
export const updateProfile = api<UpdateProfileRequest, UserProfile>(
  { expose: true, method: "PUT", path: "/auth/profile" },
  async (req) => {
    const userId = extractUserIdFromToken(req.authorization);
    
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.nama_lengkap !== undefined) {
      setParts.push(`nama_lengkap = $${paramIndex++}`);
      values.push(req.nama_lengkap);
    }
    if (req.email !== undefined) {
      setParts.push(`email = $${paramIndex++}`);
      values.push(req.email);
    }
    if (req.no_telepon !== undefined) {
      setParts.push(`no_telepon = $${paramIndex++}`);
      values.push(req.no_telepon);
    }

    if (setParts.length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    values.push(userId);
    const query = `
      UPDATE pengguna 
      SET ${setParts.join(', ')}, diubah_pada = NOW()
      WHERE id = $${paramIndex} AND dihapus_pada IS NULL
      RETURNING id, nama_lengkap, email, no_telepon, diubah_pada
    `;

    const row = await tenantDB.rawQueryRow<UserProfile>(query, ...values);
    
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