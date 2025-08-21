-- 8_alter_transaksi_to_bigint_and_varchar5.up.sql

-- 1. Ubah kolom-kolom nominal ke BIGINT
ALTER TABLE transaksi
  ALTER COLUMN nominal TYPE BIGINT USING nominal::bigint;

ALTER TABLE detail_transaksi_split
  ALTER COLUMN nominal_split TYPE BIGINT USING nominal_split::bigint;

ALTER TABLE struk
  ALTER COLUMN ocr_total TYPE BIGINT USING ocr_total::bigint;

-- 2. Ubah mata_uang (dan OCR) ke VARCHAR(5)
ALTER TABLE transaksi
  ALTER COLUMN mata_uang TYPE VARCHAR(5);

-- Selesai