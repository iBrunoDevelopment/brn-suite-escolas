-- ========================================================
-- SISTEMA DE SEGURANÇA E POLÍTICAS RLS (FINAL)
-- ========================================================

-- 1. LIMPEZA DE POLÍTICAS ANTIGAS (Wide Open)
-- Remove as políticas genéricas se existirem
DROP POLICY IF EXISTS "Allow all to authenticated" ON schools;
DROP POLICY IF EXISTS "Allow all to authenticated" ON users;
DROP POLICY IF EXISTS "Allow all to authenticated" ON programs;
DROP POLICY IF EXISTS "Allow all to authenticated" ON rubrics;
DROP POLICY IF EXISTS "Allow all to authenticated" ON financial_entries;
DROP POLICY IF EXISTS "Allow all to authenticated" ON alerts;
DROP POLICY IF EXISTS "Allow all to authenticated" ON audit_logs;
DROP POLICY IF EXISTS "Allow all to authenticated" ON suppliers;
DROP POLICY IF EXISTS "Permitir tudo para logados - Bank Accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Permitir tudo para logados - Payment Methods" ON payment_methods;

-- 2. POLÍTICAS PARA A TABELA 'USERS' (PERFIS)
-- Qualquer usuário logado pode ver o nome/foto de outros (para logs/detalhes), 
-- mas apenas o próprio ou Admins podem ver detalhes sensíveis.
-- Simplificado: Leitura por todos, escrita apenas por Admin.
CREATE POLICY "Visualização de perfis para autenticados" 
ON users FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Gestão de usuários restrita a Administradores" 
ON users FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Administrador'
  )
);

-- 3. POLÍTICAS PARA 'SCHOOLS'
-- Todos podem ver (leitura pública interna), mas edição restrita.
CREATE POLICY "Visualização de escolas para autenticados" 
ON schools FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Edição de escolas para Admin e Operadores" 
ON schools FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Administrador', 'Operador')
  )
);

-- 4. POLÍTICAS PARA 'FINANCIAL_ENTRIES' (CRÍTICO)
-- Apenas visualiza o que lhe pertence.
CREATE POLICY "Acesso granular a lançamentos" 
ON financial_entries FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND (
      users.role IN ('Administrador', 'Operador') 
      OR users.school_id = financial_entries.school_id
      OR (users.role = 'Técnico GEE' AND financial_entries.school_id = ANY(users.assigned_schools::uuid[]))
    )
  )
);

-- 5. POLÍTICAS PARA 'ACCOUNTABILITY_PROCESSES'
-- Segue a mesma lógica dos lançamentos
ALTER TABLE accountability_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso granular a processos de prestação" 
ON accountability_processes FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND (
      users.role IN ('Administrador', 'Operador') 
      OR users.school_id = accountability_processes.school_id
      OR (users.role = 'Técnico GEE' AND accountability_processes.school_id = ANY(users.assigned_schools::uuid[]))
    )
  )
);

-- 6. DEMAIS TABELAS AUXILIARES (Programs, Rubrics, Suppliers, Methods)
-- Geralmente acesso de leitura para todos e edição para Admin/Operador/Diretor.
CREATE POLICY "Leitura de auxiliares para todos" ON programs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Gestão de programas para Admin/Operador" ON programs FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Administrador', 'Operador')));

CREATE POLICY "Leitura de rubricas para todos" ON rubrics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Gestão de rubricas" ON rubrics FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Administrador', 'Operador', 'Diretor', 'Técnico GEE')));

CREATE POLICY "Leitura de fornecedores para todos" ON suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Gestão de fornecedores" ON suppliers FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Administrador', 'Operador', 'Diretor', 'Técnico GEE')));

-- 7. AUDIT LOGS
-- Todos geram, mas visualização pode ser restrita?
-- Deixamos leitura para todos autenticados para fins de transparência.
CREATE POLICY "Leitura de logs" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Inserção de logs" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- FINALIZAÇÃO
COMMENT ON TABLE financial_entries IS 'Tabela filtrada por RLS baseada no vínculo do usuário com a escola';
