-- Adiciona suporte a pagamentos parciais
ALTER TABLE platform_billing ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) DEFAULT 0.00;

-- Atualiza registros antigos marcados como 'Pago' para terem o paid_amount igual ao amount
UPDATE platform_billing SET paid_amount = amount WHERE status = 'Pago' AND paid_amount = 0;
