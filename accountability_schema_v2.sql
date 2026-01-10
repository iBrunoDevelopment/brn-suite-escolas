
-- accountability_schema_v2.sql

-- 1. Accountability Processes
CREATE TABLE IF NOT EXISTS accountability_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    financial_entry_id UUID REFERENCES financial_entries(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id),
    status TEXT DEFAULT 'Em Andamento', -- 'Em Andamento', 'Concluído'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Items of the accountability (Main Source)
CREATE TABLE IF NOT EXISTS accountability_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES accountability_processes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL,
    unit TEXT NOT NULL,
    winner_unit_price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Quotations (Fornecedores Concorrentes)
CREATE TABLE IF NOT EXISTS accountability_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES accountability_processes(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    supplier_cnpj TEXT,
    is_winner BOOLEAN DEFAULT FALSE,
    total_value DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Multi-item Quotes support
CREATE TABLE IF NOT EXISTS accountability_quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES accountability_quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL,
    unit TEXT NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Notifications system
CREATE TABLE IF NOT EXISTS accountability_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'success', 'warning', 'info'
    read BOOLEAN DEFAULT FALSE,
    process_id UUID REFERENCES accountability_processes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE accountability_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_notifications ENABLE ROW LEVEL SECURITY;

-- Simple Policies
CREATE POLICY "Allow all to authenticated - proc" ON accountability_processes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all to authenticated - items" ON accountability_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all to authenticated - quotes" ON accountability_quotes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all to authenticated - q_items" ON accountability_quote_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all to authenticated - notif" ON accountability_notifications FOR ALL USING (auth.role() = 'authenticated');
