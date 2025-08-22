-- Migration to fix BigInt operations and ensure consistency
-- This migration addresses the "Cannot mix BigInt and other types" error

-- Ensure all numeric columns are properly typed as BIGINT
ALTER TABLE transaksi 
  ALTER COLUMN nominal TYPE BIGINT USING nominal::bigint;

ALTER TABLE detail_transaksi_split 
  ALTER COLUMN nominal_split TYPE BIGINT USING nominal_split::bigint;

ALTER TABLE struk 
  ALTER COLUMN ocr_total TYPE BIGINT USING ocr_total::bigint;

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

-- Create function to convert number to bigint safely
CREATE OR REPLACE FUNCTION to_bigint_cents(amount NUMERIC)
RETURNS BIGINT AS $$
BEGIN
  RETURN (amount * 100)::BIGINT;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Create function to convert bigint cents to decimal
CREATE OR REPLACE FUNCTION from_bigint_cents(amount BIGINT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (amount::NUMERIC / 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Update any existing data to ensure consistency
UPDATE transaksi SET nominal = nominal::bigint WHERE nominal IS NOT NULL;
UPDATE detail_transaksi_split SET nominal_split = nominal_split::bigint WHERE nominal_split IS NOT NULL;
UPDATE struk SET ocr_total = ocr_total::bigint WHERE ocr_total IS NOT NULL;

-- Add constraints to ensure data integrity
ALTER TABLE transaksi ADD CONSTRAINT check_nominal_positive CHECK (nominal > 0);
ALTER TABLE detail_transaksi_split ADD CONSTRAINT check_nominal_split_positive CHECK (nominal_split > 0);