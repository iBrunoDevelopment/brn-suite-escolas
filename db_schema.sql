CREATE TYPE user_role AS ENUM ('Administrador', 'Operador', 'Diretor', 'Técnico GEE', 'Cliente');
CREATE TYPE transaction_status AS ENUM ('Pago', 'Recebido', 'Pendente', 'Estornado', 'Conciliado', 'Agendado', 'Consolidado');
CREATE TYPE transaction_nature AS ENUM ('Custeio', 'Capital');
CREATE TYPE transaction_type AS ENUM ('Entrada', 'Saída');
CREATE TYPE alert_severity AS ENUM ('Crítico', 'Atenção', 'Informativo');

-- Schools Table
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    inep TEXT,
    seec TEXT,
    conselho_escolar TEXT,
    cnpj TEXT,
    phone TEXT,
    director TEXT,
    secretary TEXT,
    address TEXT,
    city TEXT,
    uf TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL,
    school_id UUID REFERENCES schools(id),
    assigned_schools UUID[],
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Programs Table
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rubrics Table
CREATE TABLE rubrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    default_nature transaction_nature DEFAULT 'Custeio',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers Table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    cep TEXT,
    address TEXT,
    city TEXT,
    uf TEXT,
    bank_info JSONB DEFAULT '{"bank": "", "agency": "", "account": ""}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank Accounts Table
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id),
    program_id UUID REFERENCES programs(id),
    name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    agency TEXT,
    account_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Methods Table
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Entries Table
CREATE TABLE financial_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) NOT NULL,
    date DATE NOT NULL,
    program_id UUID REFERENCES programs(id) NOT NULL,
    rubric_id UUID REFERENCES rubrics(id),
    supplier_id UUID REFERENCES suppliers(id),
    bank_account_id UUID REFERENCES bank_accounts(id),
    payment_method_id UUID REFERENCES payment_methods(id),
    description TEXT,
    value DECIMAL(15, 2) NOT NULL,
    status transaction_status DEFAULT 'Pendente',
    nature transaction_nature NOT NULL,
    type transaction_type NOT NULL,
    category TEXT,
    batch_id TEXT,
    invoice_date DATE,
    document_number TEXT,
    payment_date DATE,
    auth_number TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accountability Processes (Technical Flow)
CREATE TABLE accountability_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    financial_entry_id UUID REFERENCES financial_entries(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id),
    status TEXT DEFAULT 'Em Andamento',
    discount DECIMAL(15,2) DEFAULT 0,
    checklist JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items within an Accountability Process
CREATE TABLE accountability_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES accountability_processes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(15,4) DEFAULT 1,
    unit TEXT DEFAULT 'Unid.',
    winner_unit_price DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes from Competitors for an Accountability Process
CREATE TABLE accountability_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID REFERENCES accountability_processes(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name TEXT,
    supplier_cnpj TEXT,
    total_value DECIMAL(15,2) DEFAULT 0,
    is_winner BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items within a specific Quote (for competitors)
CREATE TABLE accountability_quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES accountability_quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(15,4) DEFAULT 1,
    unit TEXT DEFAULT 'Unid.',
    unit_price DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reprogrammed Balances
CREATE TABLE reprogrammed_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id),
    program_id UUID REFERENCES programs(id),
    rubric_id UUID REFERENCES rubrics(id),
    nature transaction_nature,
    period TEXT,
    value DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Periods
CREATE TABLE periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID REFERENCES financial_entries(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    changes JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role Permissions Matrix
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL,
    resource TEXT NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    UNIQUE(role, resource)
);

-- RLS Enablement
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reprogrammed_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Global Policies
CREATE POLICY "Full access for authenticated users" ON schools FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON programs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON rubrics FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON suppliers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON bank_accounts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON payment_methods FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON financial_entries FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON accountability_processes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON accountability_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON accountability_quotes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON accountability_quote_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON reprogrammed_balances FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON periods FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON audit_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON role_permissions FOR ALL USING (auth.role() = 'authenticated');
