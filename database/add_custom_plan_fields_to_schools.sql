
-- Adicionar colunas para personalização de planos e descontos na tabela schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS custom_title TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS custom_price TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;

-- Comentários explicativos
COMMENT ON COLUMN schools.custom_title IS 'Título personalizado do plano para esta escola específica';
COMMENT ON COLUMN schools.custom_price IS 'Valor personalizado do plano para esta escola específica';
COMMENT ON COLUMN schools.discount_value IS 'Valor do desconto mensal em reais concedido à escola';
