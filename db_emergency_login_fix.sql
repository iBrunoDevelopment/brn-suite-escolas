-- EMERGENCY FIX: CORREÇÃO DE LOOP INFINITO (RECURSÃO) NO RLS
-- O script anterior criou uma política recursiva na tabela 'users' que impede o login.
-- Este script remove as políticas problemáticas e aplica uma versão segura.

-- 1. Remover políticas recursivas da tabela users
DROP POLICY IF EXISTS "users_view_all_authenticated" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_manage_admin" ON users;
DROP POLICY IF EXISTS "users_manage_operator" ON users;

-- 2. Recriar Funções de Segurança (Garantindo SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.is_admin_safe() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Administrador');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Aplicar Políticas Seguras (Sem subqueries diretas na própria tabela fora de funções security definer)

-- A) Leitura: Todos autenticados podem ler perfis (necessário para login e listas)
CREATE POLICY "users_read_safe" ON users FOR SELECT TO authenticated USING (true);

-- B) Update Próprio: Usuário edita seu perfil
CREATE POLICY "users_update_own_safe" ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- C) Admin: Pode fazer TUDO (Insert/Update/Delete)
-- Usamos a função is_admin_safe() que é SECURITY DEFINER, quebrando a recursão
CREATE POLICY "users_admin_manage_safe" ON users FOR ALL TO authenticated USING (public.is_admin_safe());

-- D) Operador: (Opcional - vamos deixar simples por enquanto para garantir o login)
-- Se precisar que operador crie users, adicione depois. Foco agora é restaurar o login.

-- Instruções
COMMENT ON TABLE users IS 'Tabela de usuários recuperada do bloqueio RLS.';
