-- Atualização para adicionar role Cliente e sistema de permissões

-- 1. Adicionar 'Cliente' ao enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Cliente';

-- 2. Criar tabela de permissões por role
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL,
    resource TEXT NOT NULL, -- 'entries', 'schools', 'reports', 'settings', 'users'
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role, resource)
);

-- 3. Inserir permissões padrão para cada role

-- CLIENTE (apenas visualização da própria escola)
INSERT INTO role_permissions (role, resource, can_view, can_create, can_edit, can_delete) VALUES
('Cliente', 'entries', true, false, false, false),
('Cliente', 'schools', true, false, false, false),
('Cliente', 'reports', true, false, false, false),
('Cliente', 'settings', false, false, false, false),
('Cliente', 'users', false, false, false, false)
ON CONFLICT (role, resource) DO NOTHING;

-- DIRETOR (gestão completa da própria escola)
INSERT INTO role_permissions (role, resource, can_view, can_create, can_edit, can_delete) VALUES
('Diretor', 'entries', true, true, true, true),
('Diretor', 'schools', true, false, true, false),
('Diretor', 'reports', true, true, true, true),
('Diretor', 'settings', true, true, true, true),
('Diretor', 'users', false, false, false, false)
ON CONFLICT (role, resource) DO NOTHING;

-- TÉCNICO GEE (visualização e validação das escolas da GEE)
INSERT INTO role_permissions (role, resource, can_view, can_create, can_edit, can_delete) VALUES
('Técnico GEE', 'entries', true, false, true, false),
('Técnico GEE', 'schools', true, false, false, false),
('Técnico GEE', 'reports', true, false, true, false),
('Técnico GEE', 'settings', true, false, false, false),
('Técnico GEE', 'users', false, false, false, false)
ON CONFLICT (role, resource) DO NOTHING;

-- OPERADOR (gestão de todas as escolas)
INSERT INTO role_permissions (role, resource, can_view, can_create, can_edit, can_delete) VALUES
('Operador', 'entries', true, true, true, true),
('Operador', 'schools', true, true, true, true),
('Operador', 'reports', true, true, true, true),
('Operador', 'settings', true, true, true, true),
('Operador', 'users', false, false, false, false)
ON CONFLICT (role, resource) DO NOTHING;

-- ADMINISTRADOR (acesso total)
INSERT INTO role_permissions (role, resource, can_view, can_create, can_edit, can_delete) VALUES
('Administrador', 'entries', true, true, true, true),
('Administrador', 'schools', true, true, true, true),
('Administrador', 'reports', true, true, true, true),
('Administrador', 'settings', true, true, true, true),
('Administrador', 'users', true, true, true, true)
ON CONFLICT (role, resource) DO NOTHING;

-- 4. Habilitar RLS na tabela de permissões
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- 5. Política para permitir leitura de permissões para usuários autenticados
CREATE POLICY "Allow read permissions to authenticated users" 
ON role_permissions FOR SELECT 
USING (auth.role() = 'authenticated');

-- 6. Comentários para documentação
COMMENT ON TABLE role_permissions IS 'Define permissões granulares por role e recurso';
COMMENT ON COLUMN role_permissions.resource IS 'Recurso do sistema: entries, schools, reports, settings, users';
COMMENT ON COLUMN role_permissions.can_view IS 'Permissão para visualizar';
COMMENT ON COLUMN role_permissions.can_create IS 'Permissão para criar';
COMMENT ON COLUMN role_permissions.can_edit IS 'Permissão para editar';
COMMENT ON COLUMN role_permissions.can_delete IS 'Permissão para excluir';
