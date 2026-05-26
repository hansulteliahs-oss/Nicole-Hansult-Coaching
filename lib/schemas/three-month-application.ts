import { z } from 'zod';

/**
 * Phase 5 Plan 06 — FORM-03 3-Month Program application schema.
 *
 * Mirrors Phase 3 form patterns: same Zod conventions, same _hp honeypot
 * (must be empty), same shared client/server validation. Distinct from
 * contactSchema by the `goals` field (replaces `message`/`service`) — Nicole
 * needs concrete goals on application, not a free-form inquiry.
 */
export const threeMonthApplicationSchema = z.object({
  firstName: z.string().trim().min(1, { error: 'First name is required' }).max(60),
  lastName:  z.string().trim().min(1, { error: 'Last name is required' }).max(60),
  email:     z.email({ error: 'A valid email is required' }).max(120),
  phone:     z.string().trim().min(7, { error: 'Phone number is required' }).max(30),
  goals:     z
    .string()
    .trim()
    .min(10, { error: 'Share at least a sentence about your goals' })
    .max(2000),
  _hp:       z.string().max(0, { error: '' }), // honeypot — must be empty
});

export type ThreeMonthApplicationInput  = z.input<typeof threeMonthApplicationSchema>;
export type ThreeMonthApplicationOutput = z.output<typeof threeMonthApplicationSchema>;
