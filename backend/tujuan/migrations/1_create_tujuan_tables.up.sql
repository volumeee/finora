-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tujuan_tabungan table
CREATE TABLE tujuan_tabungan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  nama_tujuan VARCHAR(100) NOT NULL,
  jenis_tujuan VARCHAR(20) NOT NULL CHECK (jenis_tujuan IN ('dana_darurat', 'rumah', 'kendaraan', 'liburan', 'pendidikan', 'pensiun', 'lainnya')),
  target_nominal BIGINT NOT NULL,
  nominal_terkumpul BIGINT DEFAULT 0,
  tenggat_tanggal DATE,
  catatan TEXT,
  dibuat_pada TIMESTAMPTZ DEFAULT NOW(),
  diubah_pada TIMESTAMPTZ DEFAULT NOW(),
  dihapus_pada TIMESTAMPTZ NULL
);

-- Create kalkulator_kpr table
CREATE TABLE kalkulator_kpr (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tujuan_tabungan_id UUID NOT NULL UNIQUE REFERENCES tujuan_tabungan(id) ON DELETE CASCADE,
  harga_properti BIGINT NOT NULL,
  uang_muka_persen BIGINT NOT NULL,        -- simpan dalam basis poin (10000 = 100%)
  tenor_tahun SMALLINT NOT NULL,
  bunga_tahunan_persen BIGINT NOT NULL,    -- simpan dalam basis poin (500 = 5%)
  tipe_bunga VARCHAR(10) NOT NULL CHECK (tipe_bunga IN ('fixed', 'floating')),
  biaya_provisi BIGINT DEFAULT 0,
  biaya_admin BIGINT DEFAULT 0,
  dibuat_pada TIMESTAMPTZ DEFAULT NOW(),
  diubah_pada TIMESTAMPTZ DEFAULT NOW()
);

-- Create kontribusi_tujuan table
CREATE TABLE kontribusi_tujuan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tujuan_tabungan_id UUID NOT NULL REFERENCES tujuan_tabungan(id) ON DELETE CASCADE,
  transaksi_id UUID NOT NULL UNIQUE,
  nominal_kontribusi BIGINT NOT NULL,
  tanggal_kontribusi DATE NOT NULL
);

-- Create indexes
CREATE INDEX idx_tujuan_tenant ON tujuan_tabungan(tenant_id);
CREATE INDEX idx_tujuan_jenis ON tujuan_tabungan(jenis_tujuan);
CREATE INDEX idx_kontribusi_tujuan ON kontribusi_tujuan(tujuan_tabungan_id);
CREATE INDEX idx_kontribusi_tanggal ON kontribusi_tujuan(tanggal_kontribusi);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_diubah_pada_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.diubah_pada = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_tujuan_diubah_pada BEFORE UPDATE ON tujuan_tabungan FOR EACH ROW EXECUTE FUNCTION update_diubah_pada_column();
CREATE TRIGGER update_kalkulator_kpr_diubah_pada BEFORE UPDATE ON kalkulator_kpr FOR EACH ROW EXECUTE FUNCTION update_diubah_pada_column();

-- Function to update nominal_terkumpul when contributions change
CREATE OR REPLACE FUNCTION update_nominal_terkumpul()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    UPDATE tujuan_tabungan 
    SET nominal_terkumpul = nominal_terkumpul + NEW.nominal_kontribusi
    WHERE id = NEW.tujuan_tabungan_id;
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    UPDATE tujuan_tabungan 
    SET nominal_terkumpul = nominal_terkumpul - OLD.nominal_kontribusi + NEW.nominal_kontribusi
    WHERE id = NEW.tujuan_tabungan_id;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE tujuan_tabungan 
    SET nominal_terkumpul = nominal_terkumpul - OLD.nominal_kontribusi
    WHERE id = OLD.tujuan_tabungan_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for contribution updates
CREATE TRIGGER trigger_update_nominal_insert
  AFTER INSERT ON kontribusi_tujuan
  FOR EACH ROW EXECUTE FUNCTION update_nominal_terkumpul();

CREATE TRIGGER trigger_update_nominal_update
  AFTER UPDATE ON kontribusi_tujuan
  FOR EACH ROW EXECUTE FUNCTION update_nominal_terkumpul();

CREATE TRIGGER trigger_update_nominal_delete
  AFTER DELETE ON kontribusi_tujuan
  FOR EACH ROW EXECUTE FUNCTION update_nominal_terkumpul();
