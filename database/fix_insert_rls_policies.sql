-- ========================================================
-- CORREÇÃO CRÍTICA: WITH CHECK AUSENTE EM POLÍTICAS RLS
-- ========================================================
-- Problema: As políticas "FOR ALL" e "FOR INSERT" criadas pelo
-- db_security_hardened.sql usam apenas USING(), mas para operações
-- de INSERT o PostgreSQL exige a cláusula WITH CHECK.
-- Sem WITH CHECK, todo INSERT é bloqueado mesmo para Admins/Operadores.
-- ========================================================

-- 1. CORREÇÃO DA TABELA 'USERS'
-- A política "users_admin_manage" usa apenas USING (sem WITH CHECK),
-- bloqueando INSERTs de Admin ao criar novos usuários.
DROP POLICY IF EXISTS "users_admin_manage" ON public.users;
DROP POLICY IF EXISTS "users_admin_manage_safe" ON public.users;
DROP POLICY IF EXISTS "Gestão total para Administradores" ON public.users;
DROP POLICY IF EXISTS "Gestão de usuários restrita a Administradores" ON public.users;
DROP POLICY IF EXISTS "Inserção de perfil próprio" ON public.users;
DROP POLICY IF EXISTS "users_self_insert" ON public.users;

-- Política de Admin: pode fazer tudo na tabela users
CREATE POLICY "users_admin_manage" ON public.users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Política de self-insert: usuário pode inserir seu próprio perfil
-- (necessário para auto-registro via claim_profile_by_email)
CREATE POLICY "users_self_insert" ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Política de self-update: usuário pode atualizar o próprio perfil
DROP POLICY IF EXISTS "users_self_update" ON public.users;
DROP POLICY IF EXISTS "Auto-atualização de perfil" ON public.users;
DROP POLICY IF EXISTS "users_update_own_safe" ON public.users;
CREATE POLICY "users_self_update" ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política de leitura
DROP POLICY IF EXISTS "users_read_profile" ON public.users;
DROP POLICY IF EXISTS "users_read_safe" ON public.users;
DROP POLICY IF EXISTS "Visualização de perfis para autenticados" ON public.users;
CREATE POLICY "users_read_profile" ON public.users
FOR SELECT
TO authenticated
USING (true);


-- 2. CORREÇÃO DA TABELA 'SUPPLIERS'
-- A política "suppliers_write" usa apenas USING (sem WITH CHECK),
-- bloqueando INSERTs de Operadores/Diretores ao criar novos fornecedores.
DROP POLICY IF EXISTS "suppliers_write" ON public.suppliers;
DROP POLICY IF EXISTS "Gestão de fornecedores" ON public.suppliers;
DROP POLICY IF EXISTS "Leitura de fornecedores para todos" ON public.suppliers;

CREATE POLICY "suppliers_read" ON public.suppliers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "suppliers_write" ON public.suppliers
FOR ALL
TO authenticated
USING (
    public.is_admin()
    OR public.get_user_role() IN ('Operador', 'Diretor', 'Técnico GEE')
)
WITH CHECK (
    public.is_admin()
    OR public.get_user_role() IN ('Operador', 'Diretor', 'Técnico GEE')
);


-- 3. TAMBÉM CORRIGIR OUTRAS TABELAS COM O MESMO PROBLEMA (PREVENÇÃO)

-- Programs
DROP POLICY IF EXISTS "programs_write" ON public.programs;
DROP POLICY IF EXISTS "Gestão de programas para Admin/Operador" ON public.programs;
CREATE POLICY "programs_write" ON public.programs
FOR ALL
TO authenticated
USING (public.is_admin() OR public.get_user_role() = 'Operador')
WITH CHECK (public.is_admin() OR public.get_user_role() = 'Operador');

-- Rubrics
DROP POLICY IF EXISTS "rubrics_write" ON public.rubrics;
DROP POLICY IF EXISTS "Gestão de rubricas" ON public.rubrics;
CREATE POLICY "rubrics_write" ON public.rubrics
FOR ALL
TO authenticated
USING (public.is_admin() OR public.get_user_role() IN ('Operador', 'Diretor', 'Técnico GEE'))
WITH CHECK (public.is_admin() OR public.get_user_role() IN ('Operador', 'Diretor', 'Técnico GEE'));

-- Schools (write)
DROP POLICY IF EXISTS "config_write_schools" ON public.schools;
DROP POLICY IF EXISTS "Edição de escolas para Admin e Operadores" ON public.schools;
CREATE POLICY "config_write_schools" ON public.schools
FOR ALL
TO authenticated
USING (public.is_admin() OR public.get_user_role() = 'Operador')
WITH CHECK (public.is_admin() OR public.get_user_role() = 'Operador');

-- Reprogrammed Balances (write)
DROP POLICY IF EXISTS "reprog_write" ON public.reprogrammed_balances;
CREATE POLICY "reprog_write" ON public.reprogrammed_balances
FOR ALL
TO authenticated
USING (public.is_admin() OR public.get_user_role() = 'Operador')
WITH CHECK (public.is_admin() OR public.get_user_role() = 'Operador');

-- Financial Entries (insert e update)
DROP POLICY IF EXISTS "entries_insert" ON public.financial_entries;
DROP POLICY IF EXISTS "entries_update" ON public.financial_entries;
CREATE POLICY "entries_insert" ON public.financial_entries
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin() OR public.get_user_role() = 'Operador'
    OR (public.get_user_role() = 'Diretor' AND school_id = (SELECT school_id FROM public.users WHERE id = auth.uid()))
);
CREATE POLICY "entries_update" ON public.financial_entries
FOR UPDATE
TO authenticated
USING (
    public.is_admin() OR public.get_user_role() = 'Operador'
    OR (public.get_user_role() = 'Diretor' AND school_id = (SELECT school_id FROM public.users WHERE id = auth.uid()))
)
WITH CHECK (
    public.is_admin() OR public.get_user_role() = 'Operador'
    OR (public.get_user_role() = 'Diretor' AND school_id = (SELECT school_id FROM public.users WHERE id = auth.uid()))
);

-- Accountability Processes (write)
DROP POLICY IF EXISTS "proc_parent_write" ON public.accountability_processes;
CREATE POLICY "proc_parent_write" ON public.accountability_processes
FOR ALL
TO authenticated
USING (
    public.is_admin() OR public.get_user_role() = 'Operador'
    OR (public.get_user_role() = 'Diretor' AND school_id = (SELECT school_id FROM public.users WHERE id = auth.uid()))
)
WITH CHECK (
    public.is_admin() OR public.get_user_role() = 'Operador'
    OR (public.get_user_role() = 'Diretor' AND school_id = (SELECT school_id FROM public.users WHERE id = auth.uid()))
);

-- ========================================================
-- VERIFICAÇÃO FINAL
-- Execute para confirmar que as políticas estão corretas:
-- SELECT tablename, policyname, cmd, qual IS NOT NULL as has_using, with_check IS NOT NULL as has_with_check
-- FROM pg_policies WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
-- ========================================================
