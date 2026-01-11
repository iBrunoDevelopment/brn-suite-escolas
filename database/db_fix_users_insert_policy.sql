-- Fix Missing INSERT Policy for Users
-- This is critical for new user registration and the claim profile flow.
-- Without this, users cannot insert their own profile row.

-- 1. Ensure we don't have a specific conflicting policy (though unlikely if hardened ran)
DROP POLICY IF EXISTS "users_self_insert" ON public.users;

-- 2. Add the missing policy
-- Allows any authenticated user to insert a row into 'users', 
-- PROVIDED the 'id' of the new row matches their authentication UID.
CREATE POLICY "users_self_insert" ON public.users 
FOR INSERT 
TO authenticated 
WITH CHECK (
    auth.uid() = id
);

-- Note: The 'users_admin_manage' policy (if it exists) handles Admin inserts.
-- This policy handles Self-Registration.
