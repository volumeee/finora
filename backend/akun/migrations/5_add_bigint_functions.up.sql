-- Add BigInt helper functions to akun database for consistency
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

-- Ensure all saldo columns are properly typed as BIGINT
ALTER TABLE akun 
  ALTER COLUMN saldo_awal TYPE BIGINT USING saldo_awal::bigint,
  ALTER COLUMN saldo_terkini TYPE BIGINT USING saldo_terkini::bigint;

-- Update any existing data to ensure consistency
UPDATE akun SET 
  saldo_awal = saldo_awal::bigint,
  saldo_terkini = saldo_terkini::bigint 
WHERE saldo_awal IS NOT NULL OR saldo_terkini IS NOT NULL;