
-- Garantir que RLS está habilitado
ALTER TABLE gee ENABLE ROW LEVEL SECURITY;

-- Limpar políticas existentes para evitar duplicidade ou conflitos
DROP POLICY IF EXISTS "GEE full access for admins/operators" ON gee;
DROP POLICY IF EXISTS "GEE select for authenticated" ON gee;
DROP POLICY IF EXISTS "Full access for authenticated users" ON gee;

-- 1. Administradores e Operadores: Acesso TOTAL (Criar, Ver, Editar, Deletar)
CREATE POLICY "GEE full access for admins/operators" 
ON gee
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('Administrador', 'Operador')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('Administrador', 'Operador')
    )
);

-- 2. Demais usuários: Apenas LEITURA (Necessário para listar em formulários de escolas, etc)
CREATE POLICY "GEE select for authenticated" 
ON gee
FOR SELECT
USING (
    auth.role() = 'authenticated'
);
