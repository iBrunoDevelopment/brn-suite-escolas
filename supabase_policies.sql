-- Enable RLS on public tables (already done in schema, but ensuring)
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;

-- Allow anyone (even unauthenticated) to read schools list (needed for registration dropdowns/internal logic if we add them later)
-- Ideally, only authenticated users should read, but for initial 'Join' flows, sometimes public read is needed.
-- For now, let's stick to authenticated, but if registration needed schools, we'd need public.
-- Since our registration doesn't ask for school yet, authenticated is fine. 
-- BUT, in App.tsx 'fetchProfile' runs immediately after login.
CREATE POLICY "Enable read access for all authenticated users" ON "public"."schools" 
AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- Users Table Policies
-- 1. Allow a user to insert their own profile during sign up.
-- The check `auth.uid() = id` ensures they can't create a profile for someone else.
CREATE POLICY "Enable insert for users based on ID" ON "public"."users" 
AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 2. Allow a user to read their own profile.
CREATE POLICY "Enable read access for users based on ID" ON "public"."users" 
AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = id);

-- 3. Allow a user to update their own profile.
CREATE POLICY "Enable update for users based on ID" ON "public"."users" 
AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 4. Allow admins (if you had a role check) to see all. For now, simplifed.
