
-- SQL Completo para sincronizar a tabela 'schools' com o formulário do sistema
-- Execute este script no SQL Editor do Supabase

ALTER TABLE schools ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS inep TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS seec TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS conselho_escolar TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS director TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS secretary TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS uf TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gee TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gee_id UUID REFERENCES gee(id);

-- Recarregar o cache do PostgREST (Supabase faz isso automaticamente após DDL, 
-- mas às vezes é necessário garantir que as políticas RLS não bloqueiem)

COMMENT ON COLUMN schools.gee IS 'Nome por extenso da Regional (GEE)';
COMMENT ON COLUMN schools.gee_id IS 'Vínculo oficial com a tabela de Regionais';
