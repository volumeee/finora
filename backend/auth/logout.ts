import { api } from "encore.dev/api";
import { authDB } from "./db";
import * as bcrypt from "bcrypt";

export interface LogoutRequest {
  refresh_token: string;
}

// Logs out user by invalidating refresh token.
export const logout = api<LogoutRequest, void>(
  { expose: true, method: "POST", path: "/auth/logout" },
  async (req) => {
    // Find and delete the refresh token
    const sessions = await authDB.queryAll<{
      id: string;
      refresh_token_hash: string;
    }>`
      SELECT id, refresh_token_hash
      FROM sesi_login
      WHERE kedaluwarsa > NOW()
    `;
    
    for (const session of sessions) {
      const isValid = await bcrypt.compare(req.refresh_token, session.refresh_token_hash);
      if (isValid) {
        await authDB.exec`DELETE FROM sesi_login WHERE id = ${session.id}`;
        break;
      }
    }
  }
);
