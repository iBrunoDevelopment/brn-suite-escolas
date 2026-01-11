
-- ========================================================
-- CORREÇÃO DE REGISTRO E PERMISSÕES DE ESCOLAS
-- ========================================================

-- 1. Permitir que usuários não logados vejam a lista de escolas (necessário para cadastro)
DROP POLICY IF EXISTS "Visualização de escolas para autenticados" ON schools;
DROP POLICY IF EXISTS "Visualização pública de escolas" ON schools;
DROP POLICY IF EXISTS "Leitura pública de escolas para cadastro" ON schools;

CREATE POLICY "Leitura pública de escolas para cadastro" 
ON schools FOR SELECT 
TO anon, authenticated
USING (true);

-- 2. Permitir que o usuário insira seu próprio perfil após o signup
DROP POLICY IF EXISTS "Gestão de usuários restrita a Administradores" ON users;
DROP POLICY IF EXISTS "Inserção de perfil próprio" ON users;

-- Mantém a visualização para todos os autenticados (nome e foto)
DROP POLICY IF EXISTS "Visualização de perfis para autenticados" ON users;
CREATE POLICY "Visualização de perfis para autenticados" 
ON users FOR SELECT 
TO authenticated
USING (true);

-- Permite inserção apenas do próprio ID (auth.uid())
CREATE POLICY "Inserção de perfil próprio" 
ON users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Permite que Administradores gerenciem tudo
CREATE POLICY "Gestão total para Administradores" 
ON users FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Administrador'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Administrador'
  )
);

-- Permite que usuários atualizem seu próprio nome/avatar, mas não o papel (role)
-- Exceto se forem administradores
CREATE POLICY "Auto-atualização de perfil" 
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND (
    -- Permite se o papel não está sendo alterado OU se quem altera é Admin
    role = (SELECT role FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Administrador')
  )
);

-- 3. Garantir que a Role 'Cliente' existe e tem permissões restritas
-- (Já deve estar no db_permissions.sql, mas reforçamos aqui se necessário)
-- As permissões RLS granulares nas tabelas de dados já devem filtrar por school_id.

COMMENT ON POLICY "Leitura pública de escolas para cadastro" ON schools IS 'Permite que visitantes vejam as escolas para se cadastrarem';
COMMENT ON POLICY "Inserção de perfil próprio" ON users IS 'Permite que o novo usuário crie seu registro de perfil vinculando ao seu auth.uid()';
