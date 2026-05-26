-- Phase 5 Plan 01 Task 1 — paywall foundation schema (PAY-01 + PAY-05)
--
-- Adds:
--   1. vibrant40_members  — paid + active member roster
--   2. stripe_events      — webhook idempotency log
--   3. lesson_progress    — per-user per-day completion
--   4. submissions.kind   — discriminator for FORM-03 three-month-application rows
--   5. backfill trigger   — populates vibrant40_members.user_id on auth.users insert
--
-- RLS posture: enabled on all three new tables. Service role bypasses RLS for
-- webhook writes; members read their own rows via auth.uid() policies.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. vibrant40_members  (PAY-01)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vibrant40_members (
  email              TEXT        PRIMARY KEY,
  user_id            UUID        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  status             TEXT        NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'refunded', 'revoked')),
  stripe_session_id  TEXT,
  stripe_customer_id TEXT,
  purchased_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vibrant40_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read own row" ON public.vibrant40_members;
CREATE POLICY "members read own row" ON public.vibrant40_members
  FOR SELECT USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. stripe_events  (PAY-04 idempotency — PITFALL 2 guard)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id    TEXT        PRIMARY KEY,
  type        TEXT        NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies — service-role-only writes; RLS blocks all anon/authenticated access.

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. lesson_progress  (PAY-11)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_slug     TEXT        NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day_slug)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own progress" ON public.lesson_progress;
CREATE POLICY "users read own progress" ON public.lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users write own progress" ON public.lesson_progress;
CREATE POLICY "users write own progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own progress" ON public.lesson_progress;
CREATE POLICY "users update own progress" ON public.lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. submissions.kind  (FORM-03 discriminator)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'contact';

CREATE INDEX IF NOT EXISTS submissions_kind_idx ON public.submissions(kind);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Backfill trigger (PAY-05)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.backfill_vibrant40_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vibrant40_members
  SET user_id = NEW.id
  WHERE lower(email) = lower(NEW.email)
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS backfill_vibrant40_user_id_after_signup ON auth.users;
CREATE TRIGGER backfill_vibrant40_user_id_after_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.backfill_vibrant40_user_id();
