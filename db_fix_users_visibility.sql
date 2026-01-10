-- CORREÇÃO DE VISIBILIDADE DE USUÁRIOS
-- Este script garante que Administradores e Operadores possam ver TODOS os usuários na lista.

-- 1. Habilitar RLS na tabela users (se não estiver)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas da tabela users para evitar conflitos
DROP POLICY IF EXISTS "users_read_profile" ON users;
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_admin_all" ON users;
DROP POLICY IF EXISTS "users_select" ON users;

-- 3. Criar Políticas de Visibilidade

-- A) Leitura: 
-- Opção 1 (Permissiva - Recomendada para Intranet/Sistemas Fechados): Todos usuários logados podem ver a lista de usuários (necessário para buscar/vincular em selects)
CREATE POLICY "users_view_all_authenticated" 
ON users FOR SELECT 
TO authenticated 
USING (true);

-- B) Escrita (Update):
-- Usuários podem editar seu próprio perfil
CREATE POLICY "users_update_own" 
ON users FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- C) Gestão Total (Insert/Update/Delete):
-- Apenas Administradores podem criar, editar ou excluir qualquer usuário
-- (Assumindo validação via função is_admin ou check direto de role)
CREATE POLICY "users_manage_admin" 
ON users FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users AS u 
        WHERE u.id = auth.uid() 
        AND u.role = 'Administrador'
    )
);

-- D) Gestão Parcial (Opcional): Operadores podem criar/editar
CREATE POLICY "users_manage_operator"
ON users FOR ALL 
TO authenticated 
USING (
     EXISTS (
        SELECT 1 FROM users AS u 
        WHERE u.id = auth.uid() 
        AND u.role = 'Operador'
    )
);

-- Instruções finais
COMMENT ON TABLE users IS 'Tabela de perfis de usuários com políticas de visibilidade corrigidas.';
