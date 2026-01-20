
-- Remover políticas antigas de accountability_processes para evitar conflitos
DROP POLICY IF EXISTS "Full access for authenticated users" ON accountability_processes;
DROP POLICY IF EXISTS "Admin/Operador full access processes" ON accountability_processes;
DROP POLICY IF EXISTS "Tecnico GEE access assigned schools processes" ON accountability_processes;
DROP POLICY IF EXISTS "Director/Client view own school processes" ON accountability_processes;

-- Política Unificada de Acesso a Processos de Prestação de Contas

-- 1. Administradores e Operadores: Acesso Total
CREATE POLICY "Admin/Operador full access processes" 
ON accountability_processes
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('Administrador', 'Operador')
    )
);

-- 2. Técnicos GEE: Visualizar e Editar processos das escolas atribuídas
CREATE POLICY "Tecnico GEE access assigned schools processes"
ON accountability_processes
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'Técnico GEE'
        AND accountability_processes.school_id = ANY(users.assigned_schools)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'Técnico GEE'
        AND accountability_processes.school_id = ANY(users.assigned_schools)
    )
);

-- 3. Diretores e Clientes: Apenas visualização da própria escola
CREATE POLICY "Director/Client view own school processes"
ON accountability_processes
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('Diretor', 'Cliente')
        AND users.school_id = accountability_processes.school_id
    )
);
