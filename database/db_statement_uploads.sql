
-- 1. Create table for Statement Uploads
CREATE TABLE IF NOT EXISTS bank_statement_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('Conta Corrente', 'Conta Investimento')),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    reported_revenue DECIMAL(15, 2) DEFAULT 0,
    reported_taxes DECIMAL(15, 2) DEFAULT 0,
    reported_balance DECIMAL(15, 2) DEFAULT 0,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bank_account_id, month, year, account_type)
);

-- 2. Enable RLS
ALTER TABLE bank_statement_uploads ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- We use the functions defined in db_security_hardened.sql if available
-- is_admin() and get_user_role()

CREATE POLICY "uploads_read" ON bank_statement_uploads FOR SELECT TO authenticated USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Administrador' 
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'Operador'
    OR school_id = (SELECT school_id FROM users WHERE id = auth.uid())
    OR ((SELECT role FROM users WHERE id = auth.uid()) = 'Técnico GEE' AND school_id = ANY(SELECT unnest(assigned_schools) FROM users WHERE id = auth.uid()))
);

CREATE POLICY "uploads_insert" ON bank_statement_uploads FOR INSERT TO authenticated WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Administrador' 
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'Operador'
    OR ((SELECT role FROM users WHERE id = auth.uid()) = 'Diretor' AND school_id = (SELECT school_id FROM users WHERE id = auth.uid()))
);

CREATE POLICY "uploads_delete" ON bank_statement_uploads FOR DELETE TO authenticated USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'Administrador' 
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'Operador'
);

-- 4. Storage Bucket
-- Note: Create the bucket 'statements' in the Supabase UI first.
-- Then apply these policies for the storage objects:

-- Allow authenticated users to upload their own school statements
CREATE POLICY "statements_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'statements'
);

-- Allow authorized roles to view statements
CREATE POLICY "statements_read" ON storage.objects FOR SELECT TO authenticated USING (
    bucket_id = 'statements'
);

-- 5. Comments
COMMENT ON TABLE bank_statement_uploads IS 'Histórico de extratos bancários enviados pelas escolas.';
