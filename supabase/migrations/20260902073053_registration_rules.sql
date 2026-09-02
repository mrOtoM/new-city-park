-- ============================================
-- SUPABASE MIGRATION - registration_rules
-- Block B6 per docs/plans/011-authorization-authentication-implementation-b6-plan.md
-- Safe to re-run (CREATE OR REPLACE / DROP IF EXISTS)
-- Verify the target is the DEVELOPMENT project first.
-- ============================================

-- 1. Registration
-- Reading the count and inserting were two statements, so two people could pass
-- the capacity check at the same moment and both get in. The row lock on the
-- training serializes them.
-- Training datetimes are stored as naive local time, so "now" must be taken in
-- the same frame.

CREATE OR REPLACE FUNCTION public.register_for_training(p_training_id bigint)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _user uuid := auth.uid();
  _max integer;
  _starts_at timestamp;
  _active integer;
  _existing_id bigint;
  _existing_cancelled timestamptz;
BEGIN
  IF _user IS NULL THEN
    RETURN 'unauthenticated';
  END IF;

  SELECT t."maxParticipants", t.datetime
  INTO _max, _starts_at
  FROM public.trainings t
  WHERE t.id = p_training_id
  FOR UPDATE;

  IF _starts_at IS NULL THEN
    RETURN 'not_found';
  END IF;

  IF _starts_at <= (now() AT TIME ZONE 'Europe/Bratislava') THEN
    RETURN 'past';
  END IF;

  SELECT r.id, r.cancelled_at
  INTO _existing_id, _existing_cancelled
  FROM public.training_registrations r
  WHERE r.training_id = p_training_id AND r.user_id = _user;

  IF _existing_id IS NOT NULL AND _existing_cancelled IS NULL THEN
    RETURN 'already_registered';
  END IF;

  IF _max IS NOT NULL THEN
    SELECT count(*)
    INTO _active
    FROM public.training_registrations r
    WHERE r.training_id = p_training_id AND r.cancelled_at IS NULL;

    IF _active >= _max THEN
      RETURN 'full';
    END IF;
  END IF;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.training_registrations
    SET cancelled_at = NULL, registered_at = now()
    WHERE id = _existing_id;
  ELSE
    INSERT INTO public.training_registrations (training_id, user_id)
    VALUES (p_training_id, _user);
  END IF;

  RETURN 'ok';
END;
$$;

-- 2. Unregistration
-- The deadline used to be checked in JavaScript against a naive timestamp,
-- which the production server read as UTC and therefore off by the local
-- offset. Here both sides of the comparison are local time.

CREATE OR REPLACE FUNCTION public.unregister_from_training(p_training_id bigint)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _user uuid := auth.uid();
  _deadline timestamp;
  _existing_id bigint;
BEGIN
  IF _user IS NULL THEN
    RETURN 'unauthenticated';
  END IF;

  SELECT t."unregisterDeadline"
  INTO _deadline
  FROM public.trainings t
  WHERE t.id = p_training_id;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF _deadline IS NOT NULL AND _deadline < (now() AT TIME ZONE 'Europe/Bratislava') THEN
    RETURN 'deadline_passed';
  END IF;

  SELECT r.id
  INTO _existing_id
  FROM public.training_registrations r
  WHERE r.training_id = p_training_id AND r.user_id = _user AND r.cancelled_at IS NULL;

  IF _existing_id IS NULL THEN
    RETURN 'not_registered';
  END IF;

  UPDATE public.training_registrations
  SET cancelled_at = now()
  WHERE id = _existing_id;

  RETURN 'ok';
END;
$$;

-- Supabase grants EXECUTE to anon through default privileges, so revoking from
-- PUBLIC is not enough; anon has to be named.
REVOKE ALL ON FUNCTION public.register_for_training(bigint) FROM public, anon;
REVOKE ALL ON FUNCTION public.unregister_from_training(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.register_for_training(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_from_training(bigint) TO authenticated;

-- 3. Trainings are no longer public
-- The policy existed for an unauthenticated calendar route that no longer
-- exists and had no caller in the application. Dropping the policy alone only
-- makes RLS return no rows; the grant has to go too, or anon still holds a
-- privilege that a future policy would silently re-open.

DROP POLICY IF EXISTS "Anon can view trainings" ON public.trainings;

REVOKE ALL ON TABLE public.trainings FROM anon;
REVOKE ALL ON TABLE public.training_registrations FROM anon;
