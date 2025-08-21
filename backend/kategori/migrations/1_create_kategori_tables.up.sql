-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create kategori table
CREATE TABLE kategori (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  nama_kategori VARCHAR(100) NOT NULL,
  warna TEXT NOT NULL DEFAULT '#6b7280',
  ikon TEXT NOT NULL DEFAULT 'help-circle',
  kategori_induk_id UUID REFERENCES kategori(id),
  sistem_bawaan BOOLEAN DEFAULT false,
  dibuat_pada TIMESTAMPTZ DEFAULT NOW(),
  diubah_pada TIMESTAMPTZ DEFAULT NOW(),
  dihapus_pada TIMESTAMPTZ NULL
);

-- Create indexes
CREATE INDEX idx_kategori_tenant ON kategori(tenant_id);
CREATE INDEX idx_kategori_induk ON kategori(kategori_induk_id);
CREATE INDEX idx_kategori_sistem ON kategori(sistem_bawaan);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_diubah_pada_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.diubah_pada = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_kategori_diubah_pada BEFORE UPDATE ON kategori FOR EACH ROW EXECUTE FUNCTION update_diubah_pada_column();

-- Insert default system categories
INSERT INTO kategori (id, tenant_id, nama_kategori, warna, ikon, sistem_bawaan) VALUES
(uuid_generate_v4(), NULL, 'Makan & Minum', '#f43f5e', 'utensils', true),
(uuid_generate_v4(), NULL, 'Transportasi', '#3b82f6', 'car', true),
(uuid_generate_v4(), NULL, 'Belanja Bulanan', '#10b981', 'shopping-cart', true),
(uuid_generate_v4(), NULL, 'Hiburan', '#8b5cf6', 'clapperboard', true),
(uuid_generate_v4(), NULL, 'Tagihan & Listrik', '#f59e0b', 'receipt', true),
(uuid_generate_v4(), NULL, 'Gaji', '#22c55e', 'banknote', true),
(uuid_generate_v4(), NULL, 'Investasi', '#6366f1', 'trending-up', true),
(uuid_generate_v4(), NULL, 'Lain-lain', '#6b7280', 'help-circle', true);
