-- Atualização do schema para gerenciamento de usuários e GEE

-- 1. Adicionar campo GEE na tabela schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gee TEXT;

-- 2. Adicionar campo active (status) na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_schools_gee ON schools(gee);

-- 4. Comentários para documentação
COMMENT ON COLUMN schools.gee IS 'Gerência Executiva de Educação à qual a escola pertence';
COMMENT ON COLUMN users.active IS 'Status do usuário - true para ativo, false para desativado';

-- 5. Atualizar usuários existentes para ativo (se houver)
UPDATE users SET active = true WHERE active IS NULL;
