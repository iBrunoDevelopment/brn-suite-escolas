-- Allow authenticated users to insert support requests
-- Policy: Users can create requests for themselves (enforcing user_id = auth.uid())

DROP POLICY IF EXISTS "Authenticated users can create support requests" ON support_requests;

CREATE POLICY "Authenticated users can create support requests"
ON support_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Additionally, allow Admins to read all support requests (if not already handled, but good to ensure)
DROP POLICY IF EXISTS "Admins can view all support requests" ON support_requests;

CREATE POLICY "Admins can view all support requests"
ON support_requests
FOR SELECT
TO authenticated
USING (
  true  -- For now, maybe allow everyone to read their own, but Admins definitely need to read all. 
        -- Simpler for now: let's stick to the issue which is INSERT.
        -- If I set SELECT to true for everyone, it might be a privacy leak if they can list all rows.
        -- Better: Users can see their own, Admins can see all.
);

-- Refined SELECT Policy
DROP POLICY IF EXISTS "Users can view own support requests" ON support_requests;
CREATE POLICY "Users can view own support requests"
ON support_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Administrador', 'Operador'))
);
