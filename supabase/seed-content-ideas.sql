-- Seed the idea bank so scheduled runs have material on day 1.
-- Run once in the Supabase SQL editor (or psql) AFTER migration 003.
-- Re-runnable: each insert is guarded by NOT EXISTS on the topic, so running
-- it twice won't create duplicates.

INSERT INTO public.content_ideas (topic, raw_notes, tag, status)
SELECT v.topic, v.raw_notes, v.tag, 'available'
FROM (VALUES
  -- ── Seeded from the 12 placeholder /insights titles ──
  ('The 3 Biggest Mistakes People Make When Trying to "Get Back in Shape" After 40',
   'Placeholder title from the old insights page. Strength-after-40 pillar.', 'blog'),
  ('I''m Too Old to Start Exercising… Or Am I?',
   'Mindset / never-too-late angle. Strong newsletter personal-note candidate too.', 'either'),
  ('Your Body Is Talking. Are You Listening?',
   'Mobility / listen-to-your-body pillar.', 'blog'),
  ('Why the Scale Isn''t Telling the Whole Story About Your Body After 40',
   'Body composition pillar — Seca / CLE tie-in.', 'blog'),
  ('December Reset: How to Take Care of Yourself Without Opting Out During the Holidays',
   'Seasonal. Good seasonal-offer newsletter.', 'either'),
  ('The Confidence Connection: How Better Posture Changes How Others See You',
   'Mobility + confidence angle.', 'blog'),
  ('The Fascia Factor: What It Is and Why It Could Be the Reason You Feel Stiff',
   'Mobility / fascia explainer.', 'blog'),
  ('3 Daily Stretches That Take You from Stiff and Sore to Confident and Strong',
   'Practical tip list — strong newsletter tip candidate.', 'either'),
  ('Why Mobility Matters More Than Intense Workouts After 40',
   'Mobility pillar, core thesis piece.', 'blog'),
  ('Why Smart People Over 40 Are Rethinking Their Water Habits',
   'Lifestyle / hydration.', 'blog'),
  ('Reclaiming Strength After 50: A Client''s Story (and Why It''s Never Too Late to Start)',
   'Client-transformation pillar — CONSENT-GATED, confirm with Nicole before using a real name.', 'blog'),
  ('The Power of Mobility: Why It''s the Key to Aging Gracefully',
   'Mobility pillar evergreen.', 'blog'),
  -- ── Local-SEO angles (get found in North County San Diego) ──
  ('What a Functional Longevity Coach in Carlsbad Actually Does',
   'Local-SEO: "functional longevity coach Carlsbad". Service-explainer + soft CTA.', 'blog'),
  ('Strength Training Over 40 in North County San Diego: Where to Start',
   'Local-SEO: "strength training over 40 North County San Diego".', 'blog'),
  ('Recovery, Sleep, and Hormones After 40: What Actually Moves the Needle',
   'Recovery/sleep/hormones pillar.', 'blog')
) AS v(topic, raw_notes, tag)
WHERE NOT EXISTS (
  SELECT 1 FROM public.content_ideas ci WHERE ci.topic = v.topic
);
