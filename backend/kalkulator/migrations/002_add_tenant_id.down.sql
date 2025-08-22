DROP INDEX IF EXISTS idx_calculator_results_tenant;
ALTER TABLE calculator_results DROP COLUMN IF EXISTS tenant_id;