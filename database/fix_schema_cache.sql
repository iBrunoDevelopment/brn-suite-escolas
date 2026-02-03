-- Garante que a coluna existe (caso o script anterior tenha falhado)
ALTER TABLE platform_billing ADD COLUMN IF NOT EXISTS description TEXT DEFAULT 'Mensalidade';

-- Remove a restrição que impedia duas cobranças no mesmo mês
ALTER TABLE platform_billing DROP CONSTRAINT IF EXISTS platform_billing_school_month_key;

-- Garante que todo mundo tem uma descrição padrão
UPDATE platform_billing SET description = 'Mensalidade' WHERE description IS NULL;

-- O PULO DO GATO: Força a API a recarregar o esquema e achar a coluna nova
NOTIFY pgrst, 'reload schema';
