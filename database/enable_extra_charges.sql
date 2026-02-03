-- Remove a restrição única para permitir múltiplas cobranças no mesmo mês (Mensalidade + Extras)
ALTER TABLE platform_billing DROP CONSTRAINT IF EXISTS platform_billing_school_month_key;

-- Se a constraint foi criada com outro nome, tenta remover pelo índice
DROP INDEX IF EXISTS idx_platform_billing_school_month;

-- Adiciona coluna para descrever o serviço (ex: 'Mensalidade', 'Criação de Horário', etc.)
ALTER TABLE platform_billing ADD COLUMN IF NOT EXISTS description TEXT DEFAULT 'Mensalidade';

-- Atualiza registros antigos para ter a descrição padrão
UPDATE platform_billing SET description = 'Mensalidade' WHERE description IS NULL;
