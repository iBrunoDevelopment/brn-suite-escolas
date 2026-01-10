-- Script para resetar/forçar as permissões padrão
-- Execute este script no Editor SQL do Supabase

-- Limpa permissões existentes (opcional, mas garante limpeza)
TRUNCATE TABLE role_permissions;

-- INSERIR PERMISSÕES PADRÃO

-- ADMINISTRADOR (Acesso Total)
INSERT INTO role_permissions (role, resource, can_view, can_create, can_edit, can_delete) VALUES
('Administrador', 'entries', true, true, true, true),
('Administrador', 'schools', true, true, true, true),
('Administrador', 'reports', true, true, true, true),
('Administrador', 'settings', true, true, true, true),
('Administrador', 'users', true, true, true, true);

-- OPERADOR (Quase total, exceto criar novos operadores/admins geralmente, mas aqui definimos acesso ao recurso)
INSERT INTO role_permissions (role, resource, can_view, can_create, can_edit, can_delete) VALUES
('Operador', 'entries', true, true, true, true),
('Operador', 'schools', true, true, true, true),
('Operador', 'reports', true, true, true, true),
('Operador', 'settings', true, true, true, true),
('Operador', 'users', true, true, true, false); -- Pode ver/editar, não excluir

-- DIRETOR (Gestão plena da sua unidade)
INSERT INTO role_permissions (role, resource, can_view, can_create, can_edit, can_delete) VALUES
('Diretor', 'entries', true, true, true, true),
('Diretor', 'schools', true, false, true, false), -- Pode editar dados da escola, não criar nova
('Diretor', 'reports', true, true, true, true),
('Diretor', 'settings', true, false, false, false), -- Apenas visualiza configurações globais
('Diretor', 'users', false, false, false, false); -- Não gere usuários

-- TÉCNICO GEE (Fiscalização e Monitoramento)
INSERT INTO role_permissions (role, resource, can_view, can_create, can_edit, can_delete) VALUES
('Técnico GEE', 'entries', true, false, false, false), -- Apenas visualiza lançamentos
('Técnico GEE', 'schools', true, false, false, false),
('Técnico GEE', 'reports', true, false, true, false), -- Pode editar relatórios (aprovar/rejeitar itens)
('Técnico GEE', 'settings', true, false, false, false),
('Técnico GEE', 'users', false, false, false, false);

-- CLIENTE (Visualização passiva)
INSERT INTO role_permissions (role, resource, can_view, can_create, can_edit, can_delete) VALUES
('Cliente', 'entries', true, false, false, false),
('Cliente', 'schools', true, false, false, false),
('Cliente', 'reports', true, false, false, false),
('Cliente', 'settings', false, false, false, false),
('Cliente', 'users', false, false, false, false);
