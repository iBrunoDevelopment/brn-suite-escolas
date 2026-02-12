
-- Correção para permitir upload de PDF e Dados independentemente
-- Faz com que as colunas de arquivo original sejam opcionais
ALTER TABLE bank_statement_uploads ALTER COLUMN file_url DROP NOT NULL;
ALTER TABLE bank_statement_uploads ALTER COLUMN file_name DROP NOT NULL;

-- Adiciona as colunas específicas para o PDF oficial, se não existirem
ALTER TABLE bank_statement_uploads ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE bank_statement_uploads ADD COLUMN IF NOT EXISTS pdf_name TEXT;

-- Comentário explicativo
COMMENT ON COLUMN bank_statement_uploads.pdf_url IS 'URL do extrato PDF oficial para conferência e auditoria.';
COMMENT ON COLUMN bank_statement_uploads.pdf_name IS 'Nome original do arquivo PDF.';
