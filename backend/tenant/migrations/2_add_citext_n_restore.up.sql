-- Pastikan ekstensi tersedia
CREATE EXTENSION IF NOT EXISTS "citext";


-- Trigger Encore untuk re-scan tipe kolom
ALTER TABLE pengguna ALTER COLUMN email TYPE VARCHAR(255);