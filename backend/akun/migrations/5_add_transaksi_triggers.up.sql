-- Function to update account balance when transactions change
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