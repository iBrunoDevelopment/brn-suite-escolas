-- Corrige TODAS as colunas que podem estar faltando na tabela platform_billing
-- Executar este script no Supabase SQL Editor

-- Adiciona colunas de rastreamento de tempo
ALTER TABLE platform_billing ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE platform_billing ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adiciona colunas de pagamento (caso ainda não tenham sido criadas)
ALTER TABLE platform_billing ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE platform_billing ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE platform_billing ADD COLUMN IF NOT EXISTS notes TEXT;

-- Garante que o trigger de atualização de data existe e está aplicado
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_platform_billing_modtime ON platform_billing;

CREATE TRIGGER update_platform_billing_modtime
    BEFORE UPDATE ON platform_billing
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
