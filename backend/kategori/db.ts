import { SQLDatabase } from "encore.dev/storage/sqldb";

export const kategoriDB = new SQLDatabase("kategori", {
  migrations: "./migrations",
});
