-- CORREÇÃO DE POLÍTICAS RLS PARA TABELA role_permissions
-- O erro "Erro ao sincronizar permissão" ocorre porque o RLS bloqueia escritas (INSERT/UPDATE) por padrão.

-- 1. Habilitar RLS (já deve estar, mas garante)
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas para evitar conflitos/duplicidade, se necessário
DROP POLICY IF EXISTS "Allow read permissions to authenticated users" ON role_permissions;
DROP POLICY IF EXISTS "Allow full access to admins" ON role_permissions;

-- 3. Política de Leitura: Todos os usuários autenticados podem LER as permissões (necessário para a UI funcionar para todos)
CREATE POLICY "Allow read permissions to authenticated users" 
ON role_permissions FOR SELECT 
USING (auth.role() = 'authenticated');

-- 4. Política de Escrita (INSERT, UPDATE, DELETE): Apenas administradores podem alterar permissões
-- Assumindo que você tem uma função is_admin() ou checagem de role na tabela users
-- Se a função is_admin() existir:
-- CREATE POLICY "Allow write permissions to admins" ON role_permissions FOR ALL USING (is_admin());

-- CASO A FUNÇÃO is_admin() NÃO ESTEJA DISPONÍVEL OU CONFIGURADA, USE ESTA VERSÃO MAIS GENÉRICA BASEADA NO METADATA OU CLAIMS:
-- (Ajuste conforme sua implementação de autenticação de admin. 
--  Se estiver usando a tabela 'users' para checar roles, a política seria algo como:)

CREATE POLICY "Allow write permissions to admins" 
ON role_permissions 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'Administrador'
    )
);

-- OU, se preferir uma política temporária permissiva para garantir o funcionamento imediato durante o setup:
-- (Não recomendado para produção, mas resolve o bloqueio imediatamente se o usuário admin não estiver corretamente vinculado)
-- CREATE POLICY "Allow all to authenticated (TEMP)" ON role_permissions FOR ALL USING (auth.role() = 'authenticated');
