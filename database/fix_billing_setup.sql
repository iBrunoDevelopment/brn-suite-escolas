-- Garante que a tabela existe
CREATE TABLE IF NOT EXISTS platform_billing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    reference_month DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Cancelado', 'Atrasado')),
    payment_method TEXT,
    payment_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, reference_month)
);

-- Habilita RLS (segurança)
ALTER TABLE platform_billing ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas para recriar corretamente
DROP POLICY IF EXISTS "Admins have full access to billing" ON platform_billing;

-- Cria policy permitindo tudo para Administradores
CREATE POLICY "Admins have full access to billing" 
ON platform_billing FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'Administrador'
    )
);

-- Garante que a função de trigger existe (caso não exista no schema base)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Remove trigger antigo para evitar duplicidade
DROP TRIGGER IF EXISTS update_platform_billing_modtime ON platform_billing;

-- Cria o trigger de atualização de data
CREATE TRIGGER update_platform_billing_modtime
    BEFORE UPDATE ON platform_billing
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
