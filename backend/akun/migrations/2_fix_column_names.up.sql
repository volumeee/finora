-- Fix column name consistency
-- This migration ensures all tables use 'dihapus_pada' instead of 'deleted_at'

-- Check if deleted_at exists and rename it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'akun' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE akun RENAME COLUMN deleted_at TO dihapus_pada;
    END IF;
END $$;