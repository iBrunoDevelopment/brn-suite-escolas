
-- Tabela para Gerências Executivas de Educação (GEE)
CREATE TABLE IF NOT EXISTS gee (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela gee
ALTER TABLE gee ENABLE ROW LEVEL SECURITY;

-- Política: Todos autenticados podem ver as GEE
CREATE POLICY "Leitura pública de GEE" 
ON gee FOR SELECT 
TO authenticated 
USING (true);

-- Política: Apenas Administradores podem gerenciar GEE
CREATE POLICY "Gestão total de GEE por Admin" 
ON gee FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'Administrador'
  )
);

-- Adicionar chave estrangeira na tabela schools se não existir
-- Nota: O campo gee original era TEXT, vamos permitir migração ou uso híbrido
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gee_id UUID REFERENCES gee(id);
