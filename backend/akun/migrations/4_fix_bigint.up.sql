-- 6_alter_saldo_to_bigint.up.sql
-- memaksa kolom saldo_* menjadi BIGINT
ALTER TABLE akun
  ALTER COLUMN saldo_awal   TYPE BIGINT USING saldo_awal::bigint,
  ALTER COLUMN saldo_terkini TYPE BIGINT USING saldo_terkini::bigint;

  