-- Fix: Allow Admins and Operators to UPDATE support_requests (e.g. resolve tickets)
-- This was preventing the "Resolver" button from saving the new status.

CREATE POLICY "Admins and Operators can update support requests"
ON public.support_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('Administrador', 'Operador')
  )
);

-- Fix: Drop overly permissive view policy if exists (it was redundant and potentially unsafe)
-- The existing policy "Users can view own support requests" already handles Admin view logic correctly.
DROP POLICY IF EXISTS "Admins can view all support requests" ON public.support_requests;
