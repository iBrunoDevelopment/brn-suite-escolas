
-- Remove políticas restritivas anteriores para financial_entries
DROP POLICY IF EXISTS "Financial entries access policy" ON financial_entries;
DROP POLICY IF EXISTS "Tecnico GEE view entries" ON financial_entries;
DROP POLICY IF EXISTS "Tecnico GEE insert entries" ON financial_entries;
DROP POLICY IF EXISTS "Tecnico GEE update entries" ON financial_entries;

-- Política Unificada de Acesso a Lançamentos Financeiros (Financial Entries)

-- 1. Administradores e Operadores: Acesso Total
CREATE POLICY "Admin/Operador full access" 
ON financial_entries
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('Administrador', 'Operador')
    )
);

-- 2. Técnicos GEE: LER, CRIAR e EDITAR apenas nas escolas atribuídas
CREATE POLICY "Tecnico GEE access assigned schools"
ON financial_entries
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'Técnico GEE'
        -- Verifica se o school_id do lançamento está na lista de escolas do usuário
        AND financial_entries.school_id = ANY(users.assigned_schools)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'Técnico GEE'
        -- Verifica se o school_id do NOVO lançamento está na lista de escolas do usuário
        AND financial_entries.school_id = ANY(users.assigned_schools)
    )
);

-- 3. Diretores e Clientes: Apenas visualização da própria escola
CREATE POLICY "Director/Client view own school"
ON financial_entries
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('Diretor', 'Cliente')
        AND users.school_id = financial_entries.school_id
    )
);
