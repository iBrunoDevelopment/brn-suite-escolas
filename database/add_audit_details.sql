-- Adiciona coluna details na tabela audit_logs se não existir
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;

-- Adiciona colunas de auditoria na tabela financial_entries para acesso rápido
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- Backfill opcional: Tentar preencher created_by_name a partir dos logs de CREATE se existirem
UPDATE financial_entries 
SET created_by_name = (
    SELECT user_name 
    FROM audit_logs 
    WHERE audit_logs.entry_id = financial_entries.id 
    AND action = 'CREATE' 
    LIMIT 1
)
WHERE created_by_name IS NULL;
