import { z } from 'zod';

/**
 * Entry 1 — Idea Bank intake schema.
 *
 * Backs the /idea capture form Nicole uses to bank a topic whenever inspiration
 * hits. Mirrors the site's form conventions (Zod v4, `_hp` honeypot that must be
 * empty). The one difference from the public forms: a shared passcode (`key`,
 * verified server-side against IDEA_BANK_KEY) gates the bank so only Nicole can
 * write to it.
 *
 * Maps to Supabase `content_ideas`: topic -> topic, notes -> raw_notes,
 * tag -> tag, imageUrls -> image_urls. `status` is forced to 'available'
 * server-side (that's what the scheduled Pick Idea node reads).
 */
export const IDEA_TAGS = ['blog', 'newsletter', 'either'] as const;

export const ideaSchema = z.object({
  key:       z.string().min(1, { error: 'Enter your idea-bank key' }),
  topic:     z.string().trim().min(1, { error: 'Add a topic' }).max(300),
  notes:     z.string().trim().max(5000).default(''),
  tag:       z.enum(IDEA_TAGS).default('either'),
  imageUrls: z.array(z.url()).max(5).default([]),
  _hp:       z.string().max(0, { error: '' }), // honeypot — must be empty
});

export type IdeaInput  = z.input<typeof ideaSchema>;
export type IdeaOutput = z.output<typeof ideaSchema>;
