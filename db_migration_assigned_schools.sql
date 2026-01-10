-- Migração para converter assigned_schools de TEXT[] para UUID[]
-- Isso permite o uso eficiente em políticas RLS e garante integridade referencial lógica

ALTER TABLE users 
ALTER COLUMN assigned_schools TYPE UUID[] 
USING assigned_schools::UUID[];

-- Adicionar comentário para documentação
COMMENT ON COLUMN users.assigned_schools IS 'Lista de IDs de escolas às quais o Técnico GEE tem acesso';
