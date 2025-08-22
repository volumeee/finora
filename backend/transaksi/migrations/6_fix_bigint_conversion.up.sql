-- Fix BigInt conversion issues by ensuring all numeric operations are consistent
-- This migration ensures all BIGINT columns are properly handled

-- Ensure all nominal columns are BIGINT
ALTER TABLE transaksi 
  ALTER COLUMN nominal TYPE BIGINT USING nominal::bigint;

ALTER TABLE detail_transaksi_split 
  ALTER COLUMN nominal_split TYPE BIGINT USING nominal_split::bigint;

ALTER TABLE struk 
  ALTER COLUMN ocr_total TYPE BIGINT USING ocr_total::bigint;

-- Create helper functions for BigInt operations
CREATE OR REPLACE FUNCTION safe_bigint_add(a BIGINT, b BIGINT)
RETURNS BIGINT AS $$
BEGIN
  RETURN a + b;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION safe_bigint_subtract(a BIGINT, b BIGINT)
RETURNS BIGINT AS $$
BEGIN
  RETURN a - b;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update any existing data to ensure consistency
UPDATE transaksi SET nominal = nominal::bigint WHERE nominal IS NOT NULL;
UPDATE detail_transaksi_split SET nominal_split = nominal_split::bigint WHERE nominal_split IS NOT NULL;
UPDATE struk SET ocr_total = ocr_total::bigint WHERE ocr_total IS NOT NULL;