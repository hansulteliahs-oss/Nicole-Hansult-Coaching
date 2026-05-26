import { z } from 'zod';

export const contactSchema = z.object({
  firstName: z.string().min(1, { error: 'First name is required' }),
  lastName:  z.string().min(1, { error: 'Last name is required' }),
  email:     z.email({ error: 'A valid email is required' }),
  phone:     z.string().optional(),
  service:   z.string().optional(),
  message:   z.string().min(1, { error: 'Message is required' }),
  _hp:       z.string().max(0, { error: '' }), // honeypot — must be empty
});

export type ContactInput  = z.input<typeof contactSchema>;
export type ContactOutput = z.output<typeof contactSchema>;
