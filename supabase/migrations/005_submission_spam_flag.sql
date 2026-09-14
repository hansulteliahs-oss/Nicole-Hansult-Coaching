-- ============================================================================
-- STATUS: DRAFTED, NOT APPLIED.  Review before running against production.
-- ============================================================================
-- Marks the bot submissions that arrived between 2026-09-11 and 2026-09-13 so
-- `submissions` is usable again without destroying the evidence.
--
-- Background: a browser-driven spam bot submitted 481 contact forms in ~48
-- hours. It defeated the off-screen honeypot (it fills only visible fields) and
-- paced itself at ~20/hour to stay under the 5-per-60s rate limit. Cloudflare
-- Turnstile now gates the Server Action; this migration only cleans up after it.
--
-- Flag rather than DELETE: the rows carry 127 real third-party email addresses
-- and a precise attack timeline. If this escalates (abuse report, Resend
-- deliverability review) that record is the evidence, and a delete is final.
-- Purge later with:  DELETE FROM public.submissions WHERE spam;
-- ----------------------------------------------------------------------------

alter table public.submissions
  add column if not exists spam boolean not null default false;

comment on column public.submissions.spam is
  'True for submissions identified as bot traffic. Set by 005 backfill for the 2026-09-11 flood; real submissions stay false.';

-- Backfill by the flood''s exact generator signature rather than by date alone,
-- so a genuine submission that happened to land in the window is never flagged.
-- Signature: first and last name exactly 10 chars, message exactly 55 chars,
-- all three alphanumeric-only. All 481 rows match; all 7 real ones do not.
update public.submissions
set spam = true
where form_type = 'contact'
  and created_at >= '2026-09-11'::timestamptz
  and length(data->>'firstName') = 10
  and length(data->>'lastName')  = 10
  and length(data->>'message')   = 55
  and (data->>'firstName') ~ '^[A-Za-z0-9]+$'
  and (data->>'lastName')  ~ '^[A-Za-z0-9]+$'
  and (data->>'message')   ~ '^[A-Za-z0-9]+$';

-- Keeps the "real submissions only" read fast as the table grows.
create index if not exists submissions_not_spam_created_at_idx
  on public.submissions (created_at desc)
  where not spam;
