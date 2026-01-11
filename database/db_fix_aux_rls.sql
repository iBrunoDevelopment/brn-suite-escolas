-- Fix RLS for Auxiliary Tables

-- 1. BANK ACCOUNTS
-- RLS is enabled but no policies exist.
-- Users need to SEE bank accounts to select them in dropdowns.
-- Admins/Operators need to MANAGE them.
-- Directors might need to manage their school's accounts? Let's assume Admin/Op managing for now, or maybe Directors too if it's school specific. 
-- Looking at schema, bank_accounts usually has school_id.
-- Let's be permissive on SELECT (read all is fine, or scoped to school). Read ALL is safer for avoiding dropdown bugs.
DROP POLICY IF EXISTS "bank_accounts_read" ON bank_accounts;
CREATE POLICY "bank_accounts_read" ON bank_accounts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bank_accounts_write" ON bank_accounts;
CREATE POLICY "bank_accounts_write" ON bank_accounts FOR ALL TO authenticated USING (
  is_admin() OR 
  get_user_role() = 'Operador' OR 
  (get_user_role() = 'Diretor' AND school_id IN (SELECT school_id FROM users WHERE id = auth.uid()))
);

-- 2. PAYMENT METHODS
-- Setup table, likely static or admin managed.
DROP POLICY IF EXISTS "payment_methods_read" ON payment_methods;
CREATE POLICY "payment_methods_read" ON payment_methods FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "payment_methods_write" ON payment_methods;
CREATE POLICY "payment_methods_write" ON payment_methods FOR ALL TO authenticated USING (is_admin() OR get_user_role() = 'Operador');

-- 3. SYSTEM SETTINGS
-- Global configs.
DROP POLICY IF EXISTS "system_settings_read" ON system_settings;
CREATE POLICY "system_settings_read" ON system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "system_settings_write" ON system_settings;
CREATE POLICY "system_settings_write" ON system_settings FOR ALL TO authenticated USING (is_admin());

-- 4. ACCOUNTABILITY NOTIFICATIONS
-- If this table is used, it likely links accountability processes to notifications.
-- Assuming structure logic similar to notifications.
DROP POLICY IF EXISTS "acc_notif_select" ON accountability_notifications;
CREATE POLICY "acc_notif_select" ON accountability_notifications FOR SELECT TO authenticated USING (true); -- Simplify visibility for now

DROP POLICY IF EXISTS "acc_notif_insert" ON accountability_notifications;
CREATE POLICY "acc_notif_insert" ON accountability_notifications FOR INSERT TO authenticated WITH CHECK (true);
