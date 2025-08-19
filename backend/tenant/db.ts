import { SQLDatabase } from "encore.dev/storage/sqldb";

export const tenantDB = new SQLDatabase("tenant", {
  migrations: "./migrations",
});
