
-- Tabela de Conferência de Documentos (Checklists)
CREATE TABLE IF NOT EXISTS document_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attachment_id TEXT NOT NULL UNIQUE, -- ID do arquivo no bucket/storage
    entry_id UUID REFERENCES financial_entries(id) ON DELETE CASCADE,
    checked_by UUID REFERENCES users(id),
    has_signature BOOLEAN DEFAULT false,
    has_stamp BOOLEAN DEFAULT false,
    is_legible BOOLEAN DEFAULT false,
    is_correct_value BOOLEAN DEFAULT false,
    is_correct_date BOOLEAN DEFAULT false,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE document_checklists ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso

-- 1. Administrador e Operador: Acesso Total
CREATE POLICY "Admin and Operador full access on checklists" 
ON document_checklists 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('Administrador', 'Operador')
    )
);

-- 2. Técnico GEE: Acesso aos checklists das escolas atribuídas
CREATE POLICY "Tecnico GEE access on checklists"
ON document_checklists
FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM financial_entries fe
        JOIN users u ON u.id = auth.uid()
        WHERE fe.id = document_checklists.entry_id
        AND u.role = 'Técnico GEE'
        AND fe.school_id = ANY(u.assigned_schools)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM financial_entries fe
        JOIN users u ON u.id = auth.uid()
        WHERE fe.id = document_checklists.entry_id
        AND u.role = 'Técnico GEE'
        AND fe.school_id = ANY(u.assigned_schools)
    )
);

-- 3. Diretor: Acesso apenas visualização dos checklists da sua própria escola (opcional, pode ser NONE se não quiser que vejam)
CREATE POLICY "Director view access on checklists"
ON document_checklists
FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM financial_entries fe
        JOIN users u ON u.id = auth.uid()
        WHERE fe.id = document_checklists.entry_id
        AND u.role = 'Diretor'
        AND fe.school_id = u.school_id
    )
);
