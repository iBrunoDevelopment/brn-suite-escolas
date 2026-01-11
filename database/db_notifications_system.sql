
-- Tabela de notificações se não existir
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, success, warning, error
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários veem suas notificações" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sistema insere notificações" ON notifications
    FOR INSERT WITH CHECK (true); -- Permitir que o app insira notificações

CREATE POLICY "Usuários deletam suas notificações" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam suas notificações" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Função SQL para facilitar a notificação de todos os Admins/Operadores
CREATE OR REPLACE FUNCTION notify_admins(p_title TEXT, p_message TEXT, p_type TEXT) 
RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (user_id, title, message, type)
    SELECT id, p_title, p_message, p_type
    FROM users
    WHERE role IN ('Administrador', 'Operador');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
