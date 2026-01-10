
-- ========================================================
-- SISTEMA DE AUTOMAÇÃO DE LEMBRETES MENSAIS
-- Objetivo: Notificar diretores sobre o prazo de envio (5º dia útil)
-- ========================================================

-- 1. Função para calcular o 5º dia útil de um mês/ano
CREATE OR REPLACE FUNCTION get_5th_business_day(p_year int, p_month int) 
RETURNS DATE AS $$
DECLARE
    d DATE;
    business_count INT := 0;
BEGIN
    d := make_date(p_year, p_month, 1);
    WHILE business_count < 5 LOOP
        -- 0 = Domingo, 6 = Sábado
        IF extract(dow from d) NOT IN (0, 6) THEN
            business_count := business_count + 1;
        END IF;
        IF business_count < 5 THEN
            d := d + interval '1 day';
        END IF;
    END LOOP;
    RETURN d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função principal de disparo de lembretes
CREATE OR REPLACE FUNCTION launch_monthly_reminders() 
RETURNS TEXT AS $$
DECLARE
    today DATE := CURRENT_DATE;
    deadline DATE;
    notification_start DATE;
    last_sent DATE;
    v_month int;
    v_year int;
    msg TEXT;
    reminders_count INT := 0;
BEGIN
    -- Pegamos o 5º dia útil do mês ATUAL
    v_month := extract(month from today);
    v_year := extract(year from today);
    deadline := get_5th_business_day(v_year, v_month);
    
    -- Começar a notificar 15 dias antes do deadline
    notification_start := deadline - interval '15 days';
    
    -- Verificar data do último lembrete enviado (para não spammear no mesmo dia)
    SELECT (value->>'last_sent')::DATE INTO last_sent 
    FROM system_settings 
    WHERE key = 'monthly_reminder_status';
    
    -- Se hoje está na janela de notificação E ainda não enviamos hoje
    IF today >= notification_start AND today <= deadline AND (last_sent IS NULL OR last_sent < today) THEN
        
        msg := 'LEMBRETE MENSAL: Prezado Diretor, solicitamos o envio dos EXTRATOS BANCÁRIOS e NOTAS FISCAIS referentes ao mês anterior até o 5º dia útil (' || to_char(deadline, 'DD/MM/YYYY') || ').';
        
        -- Inserir para todos os Diretores
        INSERT INTO notifications (user_id, title, message, type)
        SELECT id, 'Prazo de Prestação de Contas', msg, 'warning'
        FROM users
        WHERE role = 'Diretor' AND active = true;
        
        GET DIAGNOSTICS reminders_count = ROW_COUNT;
        
        -- Atualizar status no sistema
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ('monthly_reminder_status', jsonb_build_object('last_sent', today, 'deadline', deadline), NOW())
        ON CONFLICT (key) DO UPDATE 
        SET value = jsonb_build_object('last_sent', today, 'deadline', deadline), updated_at = NOW();
        
        RETURN 'Sucesso: ' || reminders_count || ' diretores notificados.';
    END IF;

    RETURN 'Fora da janela de notificação ou já enviado hoje. Próximo prazo: ' || to_char(deadline, 'DD/MM/YYYY');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Inserir registro inicial se não existir
INSERT INTO system_settings (key, value)
VALUES ('monthly_reminder_status', '{"last_sent": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMENT ON FUNCTION launch_monthly_reminders IS 'Dispara automaticamente mensagens para diretores 15 dias antes do 5º dia útil do mês.';
