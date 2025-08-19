import { api, APIError } from "encore.dev/api";
import { authDB } from "./db";
import * as bcrypt from "bcrypt";

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

// Refreshes access token using refresh token.
export const refreshToken = api<RefreshTokenRequest, RefreshTokenResponse>(
  { expose: true, method: "POST", path: "/auth/refresh" },
  async (req) => {
    // Find valid refresh token
    const sessions = await authDB.queryAll<{
      id: string;
      pengguna_id: string;
      refresh_token_hash: string;
    }>`
      SELECT id, pengguna_id, refresh_token_hash
      FROM sesi_login
      WHERE kedaluwarsa > NOW()
    `;
    
    let validSession = null;
    for (const session of sessions) {
      const isValid = await bcrypt.compare(req.refresh_token, session.refresh_token_hash);
      if (isValid) {
        validSession = session;
        break;
      }
    }
    
    if (!validSession) {
      throw APIError.unauthenticated("invalid or expired refresh token");
    }
    
    // Generate new tokens
    const accessToken = generateAccessToken(validSession.pengguna_id);
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    
    // Update refresh token
    await authDB.exec`
      UPDATE sesi_login
      SET refresh_token_hash = ${newRefreshTokenHash}, kedaluwarsa = NOW() + INTERVAL '30 days'
      WHERE id = ${validSession.id}
    `;
    
    return {
      access_token: accessToken,
      refresh_token: newRefreshToken
    };
  }
);

function generateAccessToken(userId: string): string {
  // In production, use proper JWT library
  return `access_${userId}_${Date.now()}`;
}

function generateRefreshToken(): string {
  // In production, use crypto.randomBytes
  return `refresh_${Math.random().toString(36).substring(2)}_${Date.now()}`;
}
