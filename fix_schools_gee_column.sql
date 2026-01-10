
-- Garantir que a tabela schools possua as colunas necessárias para a nova estrutura de GEE
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gee TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gee_id UUID REFERENCES gee(id);

-- Comentário: A coluna 'gee' armazena o nome por extenso para compatibilidade e performance, 
-- enquanto 'gee_id' mantém o vínculo relacional com a tabela de regionais.
