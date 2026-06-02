import { z } from 'zod';

/**
 * Phase 5 Plan 06 — FORM-03 3-Month Program application schema.
 *
 * Mirrors Phase 3 form patterns: same Zod conventions, same _hp honeypot
 * (must be empty), same shared client/server validation. The intake question
 * set mirrors Nicole's Acuity CLE intake form: one required "#1 struggle"
 * prompt, a required consistency-blocker radio, and several optional
 * open-ended prompts. Name / email / phone are retained (Acuity gets those at
 * booking; this standalone web form must collect them so Nicole can reply).
 */
export const CONSISTENCY_BLOCKERS = [
  'Time constraints',
  'Lack of motivation',
  'Not knowing what to do',
  'Accountability',
  'Pain or injury',
  'All the above',
] as const;

export const COMMITMENT_LEVELS = [
  'Very committed',
  'Somewhat committed',
  'Not sure yet',
] as const;

export const threeMonthApplicationSchema = z.object({
  firstName: z.string().trim().min(1, { error: 'First name is required' }).max(60),
  lastName:  z.string().trim().min(1, { error: 'Last name is required' }).max(60),
  email:     z.email({ error: 'A valid email is required' }).max(120),
  phone:     z.string().trim().min(7, { error: 'Phone number is required' }).max(30),

  // Intake questions (Acuity CLE format) ─────────────────────────────────────
  struggle: z
    .string()
    .trim()
    .min(10, { error: 'Share at least a sentence about your #1 struggle' })
    .max(2000),
  desiredFeeling:  z.string().trim().max(2000).default(''),
  coachingHistory: z.string().trim().max(2000).default(''),
  mobilityLimits:  z.string().trim().max(2000).default(''),
  consistencyBlocker: z.enum(CONSISTENCY_BLOCKERS, {
    error: 'Please choose the option that fits best',
  }),
  commitment: z.enum(COMMITMENT_LEVELS, {
    error: 'Please choose how committed you are',
  }),
  additionalInfo:  z.string().trim().max(2000).default(''),

  _hp:       z.string().max(0, { error: '' }), // honeypot — must be empty
});

export type ThreeMonthApplicationInput  = z.input<typeof threeMonthApplicationSchema>;
export type ThreeMonthApplicationOutput = z.output<typeof threeMonthApplicationSchema>;
