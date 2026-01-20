-- Comprehensively Fix RLS for Reprogrammed Balances
-- The goal is to allow Directors and Technicians to also register balances for their respective schools.

DROP POLICY IF EXISTS "reprog_select" ON public.reprogrammed_balances;
DROP POLICY IF EXISTS "reprog_write" ON public.reprogrammed_balances;
DROP POLICY IF EXISTS "Users can view relevant reprogrammed balances" ON public.reprogrammed_balances;
DROP POLICY IF EXISTS "Admins and Operators can manage reprogrammed balances" ON public.reprogrammed_balances;
DROP POLICY IF EXISTS "Unified management of reprogrammed balances" ON public.reprogrammed_balances;

-- Unified Policy for SELECT (View)
CREATE POLICY "Unified view of reprogrammed balances"
ON public.reprogrammed_balances FOR SELECT
USING (
  -- Admin/Operator
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Administrador'::user_role, 'Operador'::user_role)))
  OR
  -- Director/Client (Own School)
  (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()))
  OR
  -- Tech (Assigned Schools)
  (school_id IN (SELECT unnest(assigned_schools) FROM public.users WHERE id = auth.uid()))
);

-- Unified Policy for INSERT/UPDATE/DELETE (Manage)
-- Now allowing Directors and Techs to manage their own school's balances
CREATE POLICY "Unified management of reprogrammed balances"
ON public.reprogrammed_balances FOR ALL
USING (
  -- Admin/Operator
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Administrador'::user_role, 'Operador'::user_role)))
  OR
  -- Director/Client (Own School)
  (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()))
  OR
  -- Tech (Assigned Schools)
  (school_id IN (SELECT unnest(assigned_schools) FROM public.users WHERE id = auth.uid()))
)
WITH CHECK (
  -- Admin/Operator
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Administrador'::user_role, 'Operador'::user_role)))
  OR
  -- Director/Client (Own School)
  (school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid()))
  OR
  -- Tech (Assigned Schools)
  (school_id IN (SELECT unnest(assigned_schools) FROM public.users WHERE id = auth.uid()))
);
