
-- Accountability Processes
CREATE TABLE accountability_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    financial_entry_id UUID REFERENCES financial_entries(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id),
    status TEXT DEFAULT 'Em Andamento', -- 'Em Andamento', 'Concluído'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items of the accountability (from the invoice)
CREATE TABLE accountability_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES accountability_processes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL,
    unit TEXT NOT NULL, -- 'un', 'pct', 'kg', etc.
    winner_unit_price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotations from competitors
CREATE TABLE accountability_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES accountability_processes(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name TEXT NOT NULL,
    supplier_cnpj TEXT,
    is_winner BOOLEAN DEFAULT FALSE,
    total_value DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE accountability_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to authenticated - accountability_processes" ON accountability_processes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all to authenticated - accountability_items" ON accountability_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all to authenticated - accountability_quotes" ON accountability_quotes FOR ALL USING (auth.role() = 'authenticated');
