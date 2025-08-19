import { SQLDatabase } from "encore.dev/storage/sqldb";

export const akunDB = new SQLDatabase("akun", {
  migrations: "./migrations",
});
