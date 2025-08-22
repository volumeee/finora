-- Fix numeric to bigint conversion issues
-- Ensure all numeric columns are properly converted to BIGINT

-- Convert any NUMERIC columns to BIGINT in tujuan_tabungan
ALTER TABLE tujuan_tabungan 
  ALTER COLUMN target_nominal TYPE BIGINT USING target_nominal::bigint,
  ALTER COLUMN nominal_terkumpul TYPE BIGINT USING nominal_terkumpul::bigint;

-- Convert any NUMERIC columns to BIGINT in kalkulator_kpr
ALTER TABLE kalkulator_kpr 
  ALTER COLUMN harga_properti TYPE BIGINT USING harga_properti::bigint,
  ALTER COLUMN uang_muka_persen TYPE BIGINT USING uang_muka_persen::bigint,
  ALTER COLUMN bunga_tahunan_persen TYPE BIGINT USING bunga_tahunan_persen::bigint,
  ALTER COLUMN biaya_provisi TYPE BIGINT USING biaya_provisi::bigint,
  ALTER COLUMN biaya_admin TYPE BIGINT USING biaya_admin::bigint;

-- Convert any NUMERIC columns to BIGINT in kontribusi_tujuan
ALTER TABLE kontribusi_tujuan 
  ALTER COLUMN nominal_kontribusi TYPE BIGINT USING nominal_kontribusi::bigint;