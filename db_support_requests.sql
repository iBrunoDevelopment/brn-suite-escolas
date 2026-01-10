
-- Tabela para armazenar solicitações de suporte de usuários
CREATE TABLE IF NOT EXISTS support_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Pendente', -- Pendente, Em Atendimento, Resolvido
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Política: Usuário pode ver suas próprias solicitações
CREATE POLICY "Usuários veem suas solicitações" 
ON support_requests FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Política: Usuário pode inserir uma nova solicitação
CREATE POLICY "Usuários inserem solicitações" 
ON support_requests FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Política: Admins/Operadores podem ver tudo e atualizar
CREATE POLICY "Admins geem suporte" 
ON support_requests FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role IN ('Administrador', 'Operador')
  )
);
