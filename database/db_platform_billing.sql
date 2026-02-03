-- Platform Billing Table (Internal for BRN Group)
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

-- RLS
ALTER TABLE platform_billing ENABLE ROW LEVEL SECURITY;

-- Only Admins can manage billing
CREATE POLICY "Admins have full access to billing" 
ON platform_billing FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'Administrador'
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_platform_billing_modtime
    BEFORE UPDATE ON platform_billing
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
