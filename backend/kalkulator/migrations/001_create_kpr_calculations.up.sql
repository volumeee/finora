CREATE TABLE calculator_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    nama_perhitungan VARCHAR(255) NOT NULL,
    tipe_kalkulator VARCHAR(50) NOT NULL,
    input_data JSONB NOT NULL,
    result_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calculator_results_created_at ON calculator_results(created_at DESC);
CREATE INDEX idx_calculator_results_type ON calculator_results(tipe_kalkulator);
CREATE INDEX idx_calculator_results_tenant ON calculator_results(tenant_id);