-- ========================================================
-- MIGRATION: Adicionar colunas de Representante Legal
-- na tabela suppliers
-- ========================================================

ALTER TABLE public.suppliers
    ADD COLUMN IF NOT EXISTS rep_name    TEXT,
    ADD COLUMN IF NOT EXISTS rep_cpf     TEXT,
    ADD COLUMN IF NOT EXISTS rep_rg      TEXT,
    ADD COLUMN IF NOT EXISTS rep_address TEXT;

-- Atualizar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
