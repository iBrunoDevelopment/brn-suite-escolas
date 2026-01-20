
-- Garantir permissões de Lançamento para Técnico GEE
INSERT INTO role_permissions (role, resource, can_view, can_create, can_edit, can_delete)
VALUES ('Técnico GEE', 'entries', true, true, true, false)
ON CONFLICT (role, resource) DO UPDATE
SET can_create = true, can_edit = true, can_view = true;
