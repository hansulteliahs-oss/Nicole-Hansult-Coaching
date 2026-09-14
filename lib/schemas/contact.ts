import { z } from 'zod';

export const contactSchema = z.object({
  firstName: z.string().min(1, { error: 'First name is required' }),
  lastName:  z.string().min(1, { error: 'Last name is required' }),
  email:     z.email({ error: 'A valid email is required' }),
  phone:     z.string().optional(),
  service:   z.string().optional(),
  message:   z.string().min(1, { error: 'Message is required' }),
  _hp:       z.string().max(0, { error: '' }), // honeypot — must be empty
  // Minted by the Turnstile widget in the browser, verified server-side.
  // Optional in the schema so the action can return its own 'spam' result
  // rather than a field error that would tell a bot what to forge.
  turnstileToken: z.string().optional(),
});

export type ContactInput  = z.input<typeof contactSchema>;
export type ContactOutput = z.output<typeof contactSchema>;
