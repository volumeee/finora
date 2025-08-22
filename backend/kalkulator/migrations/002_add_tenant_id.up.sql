ALTER TABLE calculator_results ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_calculator_results_tenant ON calculator_results(tenant_id);