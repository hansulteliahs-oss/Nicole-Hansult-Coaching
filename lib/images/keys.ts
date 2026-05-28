/**
 * Image URL constants — one source of truth for the original Squarespace CDN URLs
 * referenced by app code. Components import these (not raw strings) and pass them
 * through `image()` to resolve to local /images/<slug> paths.
 *
 * Why this file exists:
 *   - CONTEXT.md locks in "components route image refs through image(squarespaceUrl)"
 *     so verbatim copy from CONTENT-AUDIT.md can paste in cleanly.
 *   - Plan 03's FOUND-05 grep gate disallows Squarespace CDN strings in app source
 *     to keep the cancellation precondition green.
 *   - This file is excluded from the gate (same as lib/images/map.json) — it's the
 *     authoritative place for raw URLs that other source files reference by name.
 *
 * When Phase 2 ports verbatim audit copy:
 *   - If the copy references an existing image, reuse the constant below.
 *   - If it references a new image, add the URL to docs/CONTENT-AUDIT.md, run
 *     `pnpm migrate:images` to update map.json, then add a constant here.
 */

export const IMG_HERO_PORTRAIT =
  'https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/e7b62c0b-0ac8-4840-bd03-154389d6b4ac/BrandPortraits%40MarcyBrowePhoto-165.jpg';

export const IMG_HERO_BACKGROUND =
  'https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/a924483d-49f2-4b9c-9603-384ef117b53e/clinical-longevity-evaluation-over-40-encinitas.jpg';

export const IMG_ABOUT_PORTRAIT =
  'https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/2a3795b1-b0cb-4def-b530-f842bbe048b2/BrandPortraits%40MarcyBrowePhoto-256.jpg';

export const IMG_TESTIMONIAL =
  'https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/fae3d33a-daa5-4bcc-bf3c-5b4bec2bc31c/Nicole+yellow+top+DSC04555.jpg';

export const IMG_SECA_SCANNER =
  'https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/4b8c7201-90b3-4702-aee0-cf8bbf0781d2/seca-body-composition-analysis-carlsbad-ca.jpg';

export const IMG_JOURNAL_MOVEMENT =
  'https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/ec2f222a-d8a4-45a8-94d7-09a0f3c1bc5f/functional-movement-coaching-over-40-carlsbad.jpg';

export const IMG_JOURNAL_BODY_COMP =
  'https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/41805ff6-84d0-4049-a37d-62ca9bbcf859/seca-body-composition-assessment-carlsbad.jpg';

export const IMG_JOURNAL_WELLNESS =
  'https://images.squarespace-cdn.com/content/v1/5b83975d45776e48dcfe0f15/45bc548e-4ac1-48ba-8844-43720d01cdf1/nicole-hansult-wellness-studio-carlsbad.jpg';
