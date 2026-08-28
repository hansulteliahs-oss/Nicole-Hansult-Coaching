/**
 * posts.faq — jsonb, LLM-written, defensively parsed.
 *
 * The shape deliberately matches `Faq` in lib/content/faqs.ts, so a post's FAQ
 * feeds the SAME faqPageSchema() and the SAME <FaqSection /> that /services
 * uses. One shape, one schema builder, nothing to drift.
 *
 * Spec decision: the answer-first format emits a FAQPage JSON-LD block, which
 * is most of the AI-citation win the 6-Week plan doc is after.
 *
 * Capped and deduped: this is LLM output with no other bound on it, and both
 * feed a public page (<FaqSection />, keyed on question) and its JSON-LD. A
 * run-on would put hundreds of entries in both places; a repeated question
 * would put a duplicate React key in one and a duplicate mainEntity in the
 * other. Dedupe keeps the FIRST occurrence, same as a reader would expect —
 * the first answer given is the one that renders.
 */
import type { Faq } from '@/lib/content/faqs';

const MAX_FAQ_ENTRIES = 12;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Total. Anything that is not a clean {question, answer} pair is dropped. */
export function parsePostFaq(value: unknown): Faq[] {
  if (!Array.isArray(value)) return [];

  const out: Faq[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (out.length >= MAX_FAQ_ENTRIES) break;
    if (!isRecord(entry)) continue;
    const { question, answer } = entry;
    if (typeof question !== 'string' || typeof answer !== 'string') continue;

    const q = question.trim();
    const a = answer.trim();
    if (q === '' || a === '') continue;
    if (seen.has(q)) continue;
    seen.add(q);

    out.push({ question: q, answer: a });
  }
  return out;
}
