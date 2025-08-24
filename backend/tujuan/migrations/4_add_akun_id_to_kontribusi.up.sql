-- Add akun_id column to kontribusi_tujuan table
ALTER TABLE kontribusi_tujuan ADD COLUMN IF NOT EXISTS akun_id UUID;
ALTER TABLE kontribusi_tujuan ADD COLUMN IF NOT EXISTS catatan TEXT;