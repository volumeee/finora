-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable CITEXT extension for case-insensitive text
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create sesi_login table
CREATE TABLE sesi_login (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pengguna_id UUID NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address INET,
  kedaluwarsa TIMESTAMPTZ NOT NULL,
  dibuat_pada TIMESTAMPTZ DEFAULT NOW()
);

-- Create undangan table
CREATE TABLE undangan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  email CITEXT NOT NULL,
  peran_id SMALLINT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  diundang_oleh UUID NOT NULL,
  kedaluwarsa TIMESTAMPTZ NOT NULL,
  diterima_pada TIMESTAMPTZ NULL,
  dibuat_pada TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifikasi table
CREATE TABLE notifikasi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pengguna_id UUID NOT NULL,
  judul VARCHAR(150) NOT NULL,
  isi TEXT NOT NULL,
  sudah_dibaca BOOLEAN DEFAULT false,
  tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('info', 'peringatan', 'tagihan', 'undangan')),
  metadata JSONB,
  dibuat_pada TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  tabel_target VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  aksi VARCHAR(10) NOT NULL CHECK (aksi IN ('INSERT', 'UPDATE', 'DELETE')),
  perubahan_json JSONB,
  pengguna_id UUID NOT NULL,
  waktu TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_sesi_login_pengguna ON sesi_login(pengguna_id);
CREATE INDEX idx_sesi_login_kedaluwarsa ON sesi_login(kedaluwarsa);
CREATE INDEX idx_undangan_tenant ON undangan(tenant_id);
CREATE INDEX idx_undangan_email ON undangan(email);
CREATE INDEX idx_undangan_token ON undangan(token);
CREATE INDEX idx_notifikasi_pengguna ON notifikasi(pengguna_id);
CREATE INDEX idx_notifikasi_dibaca ON notifikasi(sudah_dibaca);
CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_waktu ON audit_log(waktu);
