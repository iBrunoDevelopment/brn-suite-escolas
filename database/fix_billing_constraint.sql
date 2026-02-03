-- Cria um índice único para garantir que não haja duplicidade de cobrança para a mesma escola no mesmo mês
-- Isso corrige o erro do ON CONFLICT no upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_billing_school_month 
ON platform_billing (school_id, reference_month);

-- Tenta adicionar a constraint explicitamente usando o índice
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'platform_billing_school_month_key'
    ) THEN
        ALTER TABLE platform_billing 
        ADD CONSTRAINT platform_billing_school_month_key 
        UNIQUE USING INDEX idx_platform_billing_school_month;
    END IF;
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Constraint ou índice já existem ou dados duplicados impedem a criação.';
END $$;
