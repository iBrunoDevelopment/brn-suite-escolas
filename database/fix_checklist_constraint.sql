
-- Adicionar constraint UNIQUE para attachment_id para permitir UPSERT
ALTER TABLE document_checklists ADD CONSTRAINT document_checklists_attachment_id_key UNIQUE (attachment_id);

-- Caso a constraint já exista com outro nome ou precise ser recriada:
-- DROP INDEX IF EXISTS document_checklists_attachment_id_idx;
-- CREATE UNIQUE INDEX document_checklists_attachment_id_idx ON document_checklists (attachment_id);
