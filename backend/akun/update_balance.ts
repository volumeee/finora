import { api, APIError } from "encore.dev/api";
import { akunDB } from "./db";

interface UpdateBalanceRequest {
  akun_id: string;
  amount: number; // in cents (will be converted to BigInt)
  operation: "add" | "subtract";
}

// Internal API to update account balance
export const updateBalance = api<UpdateBalanceRequest, { success: boolean }>(
  { expose: false, method: "POST", path: "/internal/update-balance" },
  async ({ akun_id, amount, operation }) => {
    const amountBigInt = BigInt(amount);
    
    if (operation === "add") {
      await akunDB.exec`
        UPDATE akun 
        SET saldo_terkini = safe_bigint_add(saldo_terkini, ${amountBigInt})
        WHERE id = ${akun_id} AND dihapus_pada IS NULL
      `;
    } else {
      await akunDB.exec`
        UPDATE akun 
        SET saldo_terkini = safe_bigint_subtract(saldo_terkini, ${amountBigInt})
        WHERE id = ${akun_id} AND dihapus_pada IS NULL
      `;
    }

    return { success: true };
  }
);