-- ============================================
-- SUPABASE MIGRATION - training_capacity_view
-- Block B4 per docs/plans/009-authorization-authentication-implementation-b4-plan.md
-- Safe to re-run (CREATE OR REPLACE)
-- Verify the target is the DEVELOPMENT project first.
-- ============================================

-- 1. Training occupancy
-- Counting through the caller's session returns a wrong number, because RLS
-- hides other users' registrations. This view runs with owner rights instead,
-- so no column carrying personal data may ever be added to it.

CREATE OR REPLACE VIEW public.training_capacity
WITH (security_invoker = off) AS
SELECT
  t.id AS training_id,
  t."maxParticipants" AS max_participants,
  count(r.id) FILTER (WHERE r.cancelled_at IS NULL) AS active_count
FROM public.trainings t
LEFT JOIN public.training_registrations r ON r.training_id = t.id
GROUP BY t.id, t."maxParticipants";

REVOKE ALL ON public.training_capacity FROM anon;
GRANT SELECT ON public.training_capacity TO authenticated;
