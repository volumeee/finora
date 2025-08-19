import { SQLDatabase } from "encore.dev/storage/sqldb";

export const transaksiDB = new SQLDatabase("transaksi", {
  migrations: "./migrations",
});
