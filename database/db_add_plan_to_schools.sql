-- SQL para adicionar a coluna plan_id na tabela schools
-- Isso permite vincular cada escola a um plano de serviço específico

ALTER TABLE schools ADD COLUMN IF NOT EXISTS plan_id TEXT;

COMMENT ON COLUMN schools.plan_id IS 'ID do plano contratado pela escola (referência aos planos do system_settings)';
