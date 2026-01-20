
-- Corrigindo as políticas de RLS para JSONB array (as atribuições de escola são JSONB)

-- 1. Tabela financial_entries
DROP POLICY IF EXISTS "Tecnico GEE access assigned schools" ON financial_entries;
CREATE POLICY "Tecnico GEE access assigned schools v2"
ON financial_entries
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Técnico GEE'
        AND users.assigned_schools ? (financial_entries.school_id::text)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Técnico GEE'
        AND users.assigned_schools ? (financial_entries.school_id::text)
    )
);

-- 2. Tabela accountability_processes
DROP POLICY IF EXISTS "Tecnico GEE access assigned schools processes" ON accountability_processes;
CREATE POLICY "Tecnico GEE access assigned schools processes v2"
ON accountability_processes
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Técnico GEE'
        AND users.assigned_schools ? (accountability_processes.school_id::text)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Técnico GEE'
        AND users.assigned_schools ? (accountability_processes.school_id::text)
    )
);

-- 3. Tabela document_checklists (para o cofre funcionar 100%)
DROP POLICY IF EXISTS "Tecnico GEE checklist access" ON document_checklists;
CREATE POLICY "Tecnico GEE checklist access v2"
ON document_checklists
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM financial_entries fe
        JOIN users u ON u.id = auth.uid()
        WHERE fe.id = document_checklists.entry_id
        AND u.role IN ('Administrador', 'Operador')
        OR (u.role = 'Técnico GEE' AND u.assigned_schools ? (fe.school_id::text))
    )
);
