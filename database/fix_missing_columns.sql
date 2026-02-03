-- Adiciona colunas que podem estar faltando na tabela platform_billing
-- Isso corrige o erro "Could not find the 'payment_method' column"

ALTER TABLE platform_billing ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE platform_billing ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE platform_billing ADD COLUMN IF NOT EXISTS notes TEXT;
