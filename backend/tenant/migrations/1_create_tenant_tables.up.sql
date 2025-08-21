-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Pastikan ekstensi tersedia
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama VARCHAR(100) NOT NULL,
  sub_domain VARCHAR(63) UNIQUE NOT NULL,
  zona_waktu VARCHAR(50) DEFAULT 'Asia/Jakarta',
  logo_url TEXT,
  dibuat_pada TIMESTAMPTZ DEFAULT NOW(),
  diubah_pada TIMESTAMPTZ DEFAULT NOW(),
  dihapus_pada TIMESTAMPTZ NULL
);

-- Create pengguna table
CREATE TABLE pengguna (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_lengkap VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  kata_sandi_hash TEXT NOT NULL,
  avatar_url TEXT,
  no_telepon VARCHAR(20),
  dibuat_pada TIMESTAMPTZ DEFAULT NOW(),
  diubah_pada TIMESTAMPTZ DEFAULT NOW(),
  dihapus_pada TIMESTAMPTZ NULL
);

-- Create peran table
CREATE TABLE peran (
  id SMALLINT PRIMARY KEY,
  nama_peran VARCHAR(20) NOT NULL,
  keterangan TEXT
);

-- Create pengguna_tenant table
CREATE TABLE pengguna_tenant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pengguna_id UUID NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  peran_id SMALLINT NOT NULL REFERENCES peran(id),
  bergabung_pada TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, pengguna_id)
);

-- Create indexes
CREATE INDEX idx_tenants_sub_domain ON tenants(sub_domain);
CREATE INDEX idx_pengguna_email ON pengguna(email);
CREATE INDEX idx_pengguna_tenant_tenant ON pengguna_tenant(tenant_id);
CREATE INDEX idx_pengguna_tenant_pengguna ON pengguna_tenant(pengguna_id);

-- Insert default roles
INSERT INTO peran (id, nama_peran, keterangan) VALUES
(1, 'pemilik', 'Akses penuh, bisa hapus tenant'),
(2, 'admin', 'CRUD semua data, kelola user'),
(3, 'editor', 'CRUD transaksi & kategori'),
(4, 'pembaca', 'Read-only');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_diubah_pada_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.diubah_pada = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_diubah_pada BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_diubah_pada_column();
CREATE TRIGGER update_pengguna_diubah_pada BEFORE UPDATE ON pengguna FOR EACH ROW EXECUTE FUNCTION update_diubah_pada_column();


-- Trigger Encore untuk re-scan tipe kolom
ALTER TABLE pengguna ALTER COLUMN email TYPE VARCHAR(255);
