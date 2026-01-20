-- Fix RLS for Reprogrammed Balances
-- Dropping old policies to avoid conflicts
DROP POLICY IF EXISTS "reprog_select" ON public.reprogrammed_balances;
DROP POLICY IF EXISTS "reprog_write" ON public.reprogrammed_balances;
DROP POLICY IF EXISTS "Users can view relevant reprogrammed balances" ON public.reprogrammed_balances;
DROP POLICY IF EXISTS "Admins and Operators can manage reprogrammed balances" ON public.reprogrammed_balances;

-- Policy 1: View Access
-- Admins/Operators: All
-- Directors/Clients: Own School
-- Techs: Assigned Schools
-- Note: Using explicit casting ::user_role for robustness
CREATE POLICY "Users can view relevant reprogrammed balances"
ON public.reprogrammed_balances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('Administrador'::user_role, 'Operador'::user_role)
  )
  OR
  school_id IN (
    SELECT school_id FROM public.users 
    WHERE users.id = auth.uid()
  )
  OR
  school_id IN (
    SELECT unnest(assigned_schools) FROM public.users 
    WHERE users.id = auth.uid()
  )
);

-- Policy 2: Management Access (Insert/Update/Delete) for Admins and Operators only
CREATE POLICY "Admins and Operators can manage reprogrammed balances"
ON public.reprogrammed_balances FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('Administrador'::user_role, 'Operador'::user_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('Administrador'::user_role, 'Operador'::user_role)
  )
);
