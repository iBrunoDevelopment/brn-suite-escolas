-- supplier_contracts.sql
-- Module for managing long-term contracts between schools and suppliers

CREATE TABLE IF NOT EXISTS supplier_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    rubric_id UUID REFERENCES rubrics(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    monthly_value DECIMAL(15, 2) NOT NULL,
    total_value DECIMAL(15, 2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'Ativo', -- 'Ativo', 'Encerrado', 'Suspenso'
    contract_number TEXT,
    signing_date DATE,
    terms_json JSONB DEFAULT '{}'::jsonb, -- Store reajuste formula, SLA, internet speed, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link financial entries and accountability processes to contracts
ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES supplier_contracts(id) ON DELETE SET NULL;
ALTER TABLE public.accountability_processes ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES supplier_contracts(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE supplier_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all functions to authenticated users for contracts" 
ON supplier_contracts FOR ALL 
USING (auth.role() = 'authenticated');

-- Comments
COMMENT ON TABLE supplier_contracts IS 'Long-term contracts for recurring services like internet and gas, allowing 3-quote bypass in accountability.';
