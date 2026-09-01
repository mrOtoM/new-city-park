-- ============================================
-- SUPABASE MIGRATION - rls_admin_owner_and_grants
-- Block B5 per docs/plans/010-authorization-authentication-implementation-b5-plan.md
-- Safe to re-run (CREATE OR REPLACE / DROP IF EXISTS)
-- Verify the target is the DEVELOPMENT project first.
-- ============================================

-- 1. Capability helper
-- A policy on public.users cannot read public.users inline without recursing,
-- so the check is a SECURITY DEFINER function that bypasses RLS.

CREATE OR REPLACE FUNCTION public.has_admin_capabilities()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role IN ('admin', 'owner')
  );
$$;

REVOKE ALL ON FUNCTION public.has_admin_capabilities() FROM public;
GRANT EXECUTE ON FUNCTION public.has_admin_capabilities() TO authenticated;

-- 2. Trainings: admin and owner may write

DROP POLICY IF EXISTS "Admin can insert trainings" ON public.trainings;
CREATE POLICY "Admin can insert trainings"
  ON public.trainings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_admin_capabilities());

DROP POLICY IF EXISTS "Admin can update trainings" ON public.trainings;
CREATE POLICY "Admin can update trainings"
  ON public.trainings FOR UPDATE
  TO authenticated
  USING (public.has_admin_capabilities());

DROP POLICY IF EXISTS "Admin can delete trainings" ON public.trainings;
CREATE POLICY "Admin can delete trainings"
  ON public.trainings FOR DELETE
  TO authenticated
  USING (public.has_admin_capabilities());

-- 3. Registrations: admin and owner may read all and cancel someone else's

DROP POLICY IF EXISTS "Admin can view all registrations" ON public.training_registrations;
CREATE POLICY "Admin can view all registrations"
  ON public.training_registrations FOR SELECT
  TO authenticated
  USING (public.has_admin_capabilities());

DROP POLICY IF EXISTS "Admin can update all registrations" ON public.training_registrations;
CREATE POLICY "Admin can update all registrations"
  ON public.training_registrations FOR UPDATE
  TO authenticated
  USING (public.has_admin_capabilities());

-- 4. Users: admin and owner may read every profile
-- Participant lists and statistics need this. Regular users keep the own-row
-- policy from the initial setup.

DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
CREATE POLICY "Admin can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (public.has_admin_capabilities());

-- 5. Grants
-- Until now public.users carried GRANT ALL for anon and authenticated, so RLS
-- was the only control. Privileges are withdrawn first and granted back per
-- column, which stops role, id, and email changes before any policy runs.

REVOKE ALL ON TABLE public.users FROM anon;
REVOKE ALL ON TABLE public.users FROM authenticated;

GRANT SELECT ON TABLE public.users TO authenticated;
GRANT UPDATE ("phoneNumber") ON TABLE public.users TO authenticated;
