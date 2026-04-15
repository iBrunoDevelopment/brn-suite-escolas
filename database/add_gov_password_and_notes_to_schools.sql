
-- Adicionar colunas "Senha gov" e "Observações" na tabela schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gov_password TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS notes TEXT;

-- Comentários explicativos
COMMENT ON COLUMN schools.gov_password IS 'Senha de acesso gov.br do representante legal';
COMMENT ON COLUMN schools.notes IS 'Observações gerais e anotações sobre a unidade escolar';
