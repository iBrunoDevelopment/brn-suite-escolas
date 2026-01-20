
-- Versão FINAL e CORRIGIDA das políticas para tipos UUID[] (Array Nativo de UUID)

-- 1. Tabela financial_entries (Lançamentos)
DROP POLICY IF EXISTS "Admin/Operador full access" ON financial_entries;
DROP POLICY IF EXISTS "Tecnico GEE access assigned schools" ON financial_entries;
DROP POLICY IF EXISTS "Tecnico GEE access assigned schools v2" ON financial_entries;
DROP POLICY IF EXISTS "Tecnico GEE access assigned schools v3" ON financial_entries;

CREATE POLICY "Financial entries unified access"
ON financial_entries FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND (
            users.role IN ('Administrador', 'Operador')
            OR (users.role = 'Técnico GEE' AND financial_entries.school_id = ANY(users.assigned_schools))
            OR (users.role IN ('Diretor', 'Cliente') AND users.school_id = financial_entries.school_id)
        )
    )
);

-- 2. Tabela accountability_processes (Processos)
DROP POLICY IF EXISTS "Admin/Operador full access processes" ON accountability_processes;
DROP POLICY IF EXISTS "Tecnico GEE access assigned schools processes" ON accountability_processes;
DROP POLICY IF EXISTS "Tecnico GEE access assigned schools processes v2" ON accountability_processes;
DROP POLICY IF EXISTS "Tecnico GEE access assigned schools processes v3" ON accountability_processes;

CREATE POLICY "Accountability processes unified access"
ON accountability_processes FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND (
            users.role IN ('Administrador', 'Operador')
            OR (users.role = 'Técnico GEE' AND accountability_processes.school_id = ANY(users.assigned_schools))
            OR (users.role IN ('Diretor', 'Cliente') AND users.school_id = accountability_processes.school_id)
        )
    )
);

-- 3. Tabela document_checklists (Checklists do Cofre)
DROP POLICY IF EXISTS "Tecnico GEE checklist access" ON document_checklists;
DROP POLICY IF EXISTS "Tecnico GEE checklist access v2" ON document_checklists;
DROP POLICY IF EXISTS "Tecnico GEE checklist access v3" ON document_checklists;

CREATE POLICY "Document checklists unified access"
ON document_checklists FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND (
            u.role IN ('Administrador', 'Operador')
            OR EXISTS (
                SELECT 1 FROM financial_entries fe 
                WHERE fe.id = document_checklists.entry_id 
                AND (
                    (u.role = 'Técnico GEE' AND fe.school_id = ANY(u.assigned_schools))
                    OR (u.role IN ('Diretor', 'Cliente') AND fe.school_id = u.school_id)
                )
            )
        )
    )
);
