-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create transaksi table
CREATE TABLE transaksi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  akun_id UUID NOT NULL,
  kategori_id UUID,
  jenis VARCHAR(20) NOT NULL CHECK (jenis IN ('pengeluaran', 'pemasukan', 'transfer')),
  nominal BIGINT NOT NULL,
  mata_uang CHAR(3) NOT NULL DEFAULT 'IDR',
  tanggal_transaksi DATE NOT NULL,
  catatan TEXT,
  pengguna_id UUID NOT NULL,
  transaksi_berulang_id UUID,
  dibuat_pada TIMESTAMPTZ DEFAULT NOW(),
  diubah_pada TIMESTAMPTZ DEFAULT NOW(),
  dihapus_pada TIMESTAMPTZ NULL
);

-- Create detail_transaksi_split table for split categories
CREATE TABLE detail_transaksi_split (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaksi_id UUID NOT NULL REFERENCES transaksi(id) ON DELETE CASCADE,
  kategori_id UUID NOT NULL,
  nominal_split BIGINT NOT NULL
);

-- Create transfer_antar_akun table
CREATE TABLE transfer_antar_akun (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaksi_keluar_id UUID NOT NULL REFERENCES transaksi(id) ON DELETE CASCADE,
  transaksi_masuk_id UUID NOT NULL REFERENCES transaksi(id) ON DELETE CASCADE,
  dibuat_pada TIMESTAMPTZ DEFAULT NOW()
);

-- Create struk table for OCR receipts
CREATE TABLE struk (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaksi_id UUID NOT NULL UNIQUE REFERENCES transaksi(id) ON DELETE CASCADE,
  nama_file TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  ocr_merchant VARCHAR(100),
  ocr_total BIGINT,
  ocr_confidence SMALLINT,
  ocr_raw JSONB,
  dibuat_pada TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_transaksi_tenant_tanggal ON transaksi(tenant_id, tanggal_transaksi DESC);
CREATE INDEX idx_transaksi_akun ON transaksi(akun_id);
CREATE INDEX idx_transaksi_kategori ON transaksi(kategori_id);
CREATE INDEX idx_transaksi_pengguna ON transaksi(pengguna_id);
CREATE INDEX idx_transaksi_jenis ON transaksi(jenis);
CREATE INDEX idx_detail_split_transaksi ON detail_transaksi_split(transaksi_id);
CREATE INDEX idx_struk_transaksi ON struk(transaksi_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_diubah_pada_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.diubah_pada = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_transaksi_diubah_pada BEFORE UPDATE ON transaksi FOR EACH ROW EXECUTE FUNCTION update_diubah_pada_column();

-- Function to update account balance
CREATE OR REPLACE FUNCTION update_saldo_akun()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.jenis = 'pemasukan' THEN
      UPDATE akun SET saldo_terkini = saldo_terkini + NEW.nominal WHERE id = NEW.akun_id;
    ELSIF NEW.jenis = 'pengeluaran' THEN
      UPDATE akun SET saldo_terkini = saldo_terkini - NEW.nominal WHERE id = NEW.akun_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Revert old transaction
    IF OLD.jenis = 'pemasukan' THEN
      UPDATE akun SET saldo_terkini = saldo_terkini - OLD.nominal WHERE id = OLD.akun_id;
    ELSIF OLD.jenis = 'pengeluaran' THEN
      UPDATE akun SET saldo_terkini = saldo_terkini + OLD.nominal WHERE id = OLD.akun_id;
    END IF;
    
    -- Apply new transaction
    IF NEW.jenis = 'pemasukan' THEN
      UPDATE akun SET saldo_terkini = saldo_terkini + NEW.nominal WHERE id = NEW.akun_id;
    ELSIF NEW.jenis = 'pengeluaran' THEN
      UPDATE akun SET saldo_terkini = saldo_terkini - NEW.nominal WHERE id = NEW.akun_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.jenis = 'pemasukan' THEN
      UPDATE akun SET saldo_terkini = saldo_terkini - OLD.nominal WHERE id = OLD.akun_id;
    ELSIF OLD.jenis = 'pengeluaran' THEN
      UPDATE akun SET saldo_terkini = saldo_terkini + OLD.nominal WHERE id = OLD.akun_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for balance updates
CREATE TRIGGER trigger_update_saldo_insert
  AFTER INSERT ON transaksi
  FOR EACH ROW EXECUTE FUNCTION update_saldo_akun();

CREATE TRIGGER trigger_update_saldo_update
  AFTER UPDATE ON transaksi
  FOR EACH ROW EXECUTE FUNCTION update_saldo_akun();

CREATE TRIGGER trigger_update_saldo_delete
  AFTER DELETE ON transaksi
  FOR EACH ROW EXECUTE FUNCTION update_saldo_akun();
