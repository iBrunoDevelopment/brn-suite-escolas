
-- Tabela para Armazenamento de Configurações Globais do Sistema
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Política: Todos usuários autenticados podem ler as configurações
CREATE POLICY "Leitura de configurações por usuários" 
ON system_settings FOR SELECT 
TO authenticated 
USING (true);

-- Política: Apenas Administradores podem gerenciar configurações
CREATE POLICY "Gestão total de configurações por Admin" 
ON system_settings FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'Administrador'
  )
);

-- Inserir valores padrão para contatos de suporte se não existirem
INSERT INTO system_settings (key, value)
VALUES ('support_contacts', '{
    "email": "contato@brnsuite.com",
    "phone": "(00) 0000-0000",
    "whatsapp": "(00) 90000-0000",
    "instagram": "@brnsuite",
    "website": "www.brnsuite.com"
}')
ON CONFLICT (key) DO NOTHING;
