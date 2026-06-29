import { z } from 'zod';

export const leadMagnetSchema = z.object({
  firstName: z.string().min(1, { error: 'First name is required' }),
  lastName:  z.string().min(1, { error: 'Last name is required' }),
  email:     z.email({ error: 'A valid email is required' }),
  newsletterOptIn: z.boolean().optional().default(true), // pre-checked newsletter consent
  _hp:       z.string().max(0, { error: '' }), // honeypot — must be empty
});

export type LeadMagnetInput  = z.input<typeof leadMagnetSchema>;
export type LeadMagnetOutput = z.output<typeof leadMagnetSchema>;
