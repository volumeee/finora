-- Remove all triggers and functions that reference akun table
DROP TRIGGER IF EXISTS trigger_update_saldo_insert ON transaksi;
DROP TRIGGER IF EXISTS trigger_update_saldo_update ON transaksi;
DROP TRIGGER IF EXISTS trigger_update_saldo_delete ON transaksi;
DROP FUNCTION IF EXISTS update_saldo_akun();