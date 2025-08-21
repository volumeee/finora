-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create akun table
CREATE TABLE akun (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  nama_akun VARCHAR(100) NOT NULL,
  jenis VARCHAR(20) NOT NULL CHECK (jenis IN ('kas', 'bank', 'e_wallet', 'kartu_kredit', 'pinjaman', 'aset')),
  mata_uang VARCHAR(5) NOT NULL DEFAULT 'IDR',
  saldo_awal BIGINT NOT NULL DEFAULT 0,       -- simpan dalam cents
  saldo_terkini BIGINT NOT NULL DEFAULT 0,    -- simpan dalam cents
  keterangan TEXT,
  dibuat_pada TIMESTAMPTZ DEFAULT NOW(),
  diubah_pada TIMESTAMPTZ DEFAULT NOW(),
  dihapus_pada TIMESTAMPTZ NULL
);

-- Indexes
CREATE INDEX idx_akun_tenant ON akun(tenant_id);
CREATE INDEX idx_akun_jenis ON akun(jenis);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_diubah_pada_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.diubah_pada = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_akun_diubah_pada
BEFORE UPDATE ON akun
FOR EACH ROW
EXECUTE FUNCTION update_diubah_pada_column();
