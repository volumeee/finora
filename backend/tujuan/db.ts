import { SQLDatabase } from "encore.dev/storage/sqldb";

export const tujuanDB = new SQLDatabase("tujuan", {
  migrations: "./migrations",
});
