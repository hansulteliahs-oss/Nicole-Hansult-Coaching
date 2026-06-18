-- Phase 6 — AI content pipeline (idea bank → scheduled publish).
--
-- Adds:
--   1. content_ideas    — the idea bank Nicole emails into
--   2. posts            — DB-backed blog posts (replaces hardcoded /insights cards)
--   3. newsletter_drafts— biweekly newsletter issues (repurpose or standalone)
--   4. approval_tokens  — one-tap approval + idempotency anchor
--
-- RLS posture: enabled on all four tables.
--   - posts: anon/authenticated may SELECT only status='published' (public blog).
--   - the other three: service-role-only (n8n writes via SUPABASE_SECRET_KEY);
--     no policies, so RLS blocks all anon/authenticated access.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. content_ideas  (the bank)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_ideas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email  TEXT,
  topic       TEXT        NOT NULL,
  raw_notes   TEXT,
  summary     TEXT,                                   -- agent's 1-line summary
  image_urls  TEXT[]      NOT NULL DEFAULT '{}',      -- Vercel Blob URLs
  tag         TEXT        NOT NULL DEFAULT 'either'
                          CHECK (tag IN ('blog', 'newsletter', 'either')),
  status      TEXT        NOT NULL DEFAULT 'available'
                          CHECK (status IN ('available', 'used', 'blocked')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_ideas_status_tag_idx
  ON public.content_ideas (status, tag);

ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;
-- No policies — service-role-only.

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. posts  (DB-backed blog)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT        NOT NULL UNIQUE,
  status           TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft', 'approved', 'published')),
  title            TEXT        NOT NULL,
  body_md          TEXT        NOT NULL DEFAULT '',
  seo_title        TEXT,
  meta_description TEXT,
  category         TEXT,
  keyword          TEXT,                              -- primary long-tail keyword
  hero_image_url   TEXT,
  source_idea_id   UUID        REFERENCES public.content_ideas(id) ON DELETE SET NULL,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_status_published_idx
  ON public.posts (status, published_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Public blog read: anyone may read a PUBLISHED post. Drafts stay hidden.
DROP POLICY IF EXISTS "published posts are public" ON public.posts;
CREATE POLICY "published posts are public" ON public.posts
  FOR SELECT USING (status = 'published');

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. newsletter_drafts  (biweekly issues)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.newsletter_drafts (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id              UUID        REFERENCES public.posts(id) ON DELETE SET NULL,
  source_idea_id       UUID        REFERENCES public.content_ideas(id) ON DELETE SET NULL,
  type                 TEXT        NOT NULL
                                   CHECK (type IN ('repurpose', 'tip', 'client_win', 'personal', 'offer')),
  status               TEXT        NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft', 'approved', 'sent')),
  subject              TEXT        NOT NULL,
  preview_text         TEXT,
  body_html            TEXT        NOT NULL DEFAULT '',
  mailchimp_campaign_id TEXT,
  sent_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_drafts ENABLE ROW LEVEL SECURITY;
-- No policies — service-role-only.

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. approval_tokens  (one-tap approval + idempotency)
-- ──────────────────────────────────────────────────────────────────────────────
-- The n8n resume webhook does an atomic `UPDATE ... SET used=true WHERE token_hash=$1
-- AND used=false RETURNING *`. A row returned == first use (proceed); zero rows ==
-- already used / unknown (skip). This is the double-publish / double-send guard.
CREATE TABLE IF NOT EXISTS public.approval_tokens (
  token_hash  TEXT        PRIMARY KEY,                -- sha256 of the emailed token
  draft_kind  TEXT        NOT NULL CHECK (draft_kind IN ('post', 'newsletter')),
  draft_id    UUID        NOT NULL,
  used        BOOLEAN     NOT NULL DEFAULT false,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;
-- No policies — service-role-only.
