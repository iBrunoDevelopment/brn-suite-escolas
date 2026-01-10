-- ========================================================
-- SISTEMA DE SEGURANÇA E POLÍTICAS RLS (HARDENED - FINAL)
-- Limpeza e Reforço de Segurança em Profundidade
-- ========================================================

-- 1. LIMPEZA TOTAL DE POLÍTICAS EXISTENTES
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 2. FUNÇÕES AUXILIARES DE SEGURANÇA (SECURITY DEFINER)
-- Estas funções evitam recursão infinita e centralizam a lógica

CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Administrador');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. TABELA 'USERS' (PERFIS)
CREATE POLICY "users_read_profile" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_self_update" ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_admin_manage" ON users FOR ALL TO authenticated USING (is_admin());

-- 4. TABELA 'FINANCIAL_ENTRIES'
CREATE POLICY "entries_select" ON financial_entries FOR SELECT TO authenticated USING (
    is_admin() OR get_user_role() = 'Operador'
    OR school_id = (SELECT school_id FROM users WHERE id = auth.uid())
    OR (get_user_role() = 'Técnico GEE' AND school_id = ANY(SELECT unnest(assigned_schools) FROM users WHERE id = auth.uid()))
);

CREATE POLICY "entries_insert" ON financial_entries FOR INSERT TO authenticated WITH CHECK (
    is_admin() OR get_user_role() = 'Operador'
    OR (get_user_role() = 'Diretor' AND school_id = (SELECT school_id FROM users WHERE id = auth.uid()))
);

CREATE POLICY "entries_update" ON financial_entries FOR UPDATE TO authenticated USING (
    is_admin() OR get_user_role() = 'Operador'
    OR (get_user_role() = 'Diretor' AND school_id = (SELECT school_id FROM users WHERE id = auth.uid()))
);

-- Apenas ADM pode deletar permanentemente
CREATE POLICY "entries_delete" ON financial_entries FOR DELETE TO authenticated USING (is_admin());

-- 5. TABELA 'ACCOUNTABILITY_PROCESSES' E FILHOS (TRANSACIONAL)
-- As tabelas filhas (items, quotes) herdam a lógica do pai para permitir salvamento (delete/insert)

CREATE POLICY "proc_parent_select" ON accountability_processes FOR SELECT TO authenticated USING (
    is_admin() OR get_user_role() = 'Operador'
    OR school_id = (SELECT school_id FROM users WHERE id = auth.uid())
    OR (get_user_role() = 'Técnico GEE' AND school_id = ANY(SELECT unnest(assigned_schools) FROM users WHERE id = auth.uid()))
);

CREATE POLICY "proc_parent_write" ON accountability_processes FOR ALL TO authenticated USING (
    is_admin() OR get_user_role() = 'Operador'
    OR (get_user_role() = 'Diretor' AND school_id = (SELECT school_id FROM users WHERE id = auth.uid()))
) WITH CHECK (
    is_admin() OR get_user_role() = 'Operador'
    OR (get_user_role() = 'Diretor' AND school_id = (SELECT school_id FROM users WHERE id = auth.uid()))
);

-- Itens, Cotações e Itens de Cotação seguem a permissão do processo pai
CREATE POLICY "proc_children_manage" ON accountability_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM accountability_processes p WHERE p.id = process_id)
);
CREATE POLICY "proc_quotes_manage" ON accountability_quotes FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM accountability_processes p WHERE p.id = process_id)
);
CREATE POLICY "proc_quote_items_manage" ON accountability_quote_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM accountability_quotes q JOIN accountability_processes p ON p.id = q.process_id WHERE q.id = quote_id)
);

-- 6. TABELAS DE CONFIGURAÇÃO (Schools, Programs, Rubrics, Suppliers, Payment Methods)
CREATE POLICY "config_read" ON schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_write_schools" ON schools FOR ALL TO authenticated USING (is_admin() OR get_user_role() = 'Operador');

CREATE POLICY "programs_read" ON programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "programs_write" ON programs FOR ALL TO authenticated USING (is_admin() OR get_user_role() = 'Operador');

CREATE POLICY "rubrics_read" ON rubrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "rubrics_write" ON rubrics FOR ALL TO authenticated USING (is_admin() OR get_user_role() IN ('Operador', 'Diretor', 'Técnico GEE'));

CREATE POLICY "suppliers_read" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_write" ON suppliers FOR ALL TO authenticated USING (is_admin() OR get_user_role() IN ('Operador', 'Diretor', 'Técnico GEE'));

-- 7. AUDIT LOGS
CREATE POLICY "audit_read" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (true);

-- 8. COMPLEMENTO PARA REPROGRAMMED BALANCES
CREATE POLICY "reprog_select" ON reprogrammed_balances FOR SELECT TO authenticated USING (
    is_admin() OR get_user_role() = 'Operador'
    OR school_id = (SELECT school_id FROM users WHERE id = auth.uid())
    OR (get_user_role() = 'Técnico GEE' AND school_id = ANY(SELECT unnest(assigned_schools) FROM users WHERE id = auth.uid()))
);
CREATE POLICY "reprog_write" ON reprogrammed_balances FOR ALL TO authenticated USING (is_admin() OR get_user_role() = 'Operador');

-- FINALIZAÇÃO
COMMENT ON FUNCTION public.is_admin IS 'Valida se o usuário atual tem papel de Administrador';
COMMENT ON FUNCTION public.get_user_role IS 'Retorna o papel do usuário atual com segurança';
