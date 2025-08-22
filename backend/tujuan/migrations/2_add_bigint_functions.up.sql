-- Add BigInt helper functions to tujuan database for consistency
-- This ensures all BigInt operations are safe across databases

-- Create safe BigInt operation functions
CREATE OR REPLACE FUNCTION safe_bigint_add(a BIGINT, b BIGINT)
RETURNS BIGINT AS $$
BEGIN
  RETURN COALESCE(a, 0) + COALESCE(b, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION safe_bigint_subtract(a BIGINT, b BIGINT)
RETURNS BIGINT AS $$
BEGIN
  RETURN COALESCE(a, 0) - COALESCE(b, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Update the trigger function to use safe BigInt operations
CREATE OR REPLACE FUNCTION update_nominal_terkumpul()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    UPDATE tujuan_tabungan 
    SET nominal_terkumpul = safe_bigint_add(nominal_terkumpul, NEW.nominal_kontribusi)
    WHERE id = NEW.tujuan_tabungan_id;
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    UPDATE tujuan_tabungan 
    SET nominal_terkumpul = safe_bigint_add(safe_bigint_subtract(nominal_terkumpul, OLD.nominal_kontribusi), NEW.nominal_kontribusi)
    WHERE id = NEW.tujuan_tabungan_id;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE tujuan_tabungan 
    SET nominal_terkumpul = safe_bigint_subtract(nominal_terkumpul, OLD.nominal_kontribusi)
    WHERE id = OLD.tujuan_tabungan_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Ensure all existing data is consistent
UPDATE tujuan_tabungan SET 
  target_nominal = target_nominal::bigint,
  nominal_terkumpul = nominal_terkumpul::bigint 
WHERE target_nominal IS NOT NULL OR nominal_terkumpul IS NOT NULL;

UPDATE kalkulator_kpr SET 
  harga_properti = harga_properti::bigint,
  uang_muka_persen = uang_muka_persen::bigint,
  bunga_tahunan_persen = bunga_tahunan_persen::bigint,
  biaya_provisi = biaya_provisi::bigint,
  biaya_admin = biaya_admin::bigint
WHERE harga_properti IS NOT NULL;

UPDATE kontribusi_tujuan SET 
  nominal_kontribusi = nominal_kontribusi::bigint 
WHERE nominal_kontribusi IS NOT NULL;