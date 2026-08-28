/**
 * posts.faq — jsonb, LLM-written, defensively parsed.
 *
 * The shape deliberately matches `Faq` in lib/content/faqs.ts, so a post's FAQ
 * feeds the SAME faqPageSchema() and the SAME <FaqSection /> that /services
 * uses. One shape, one schema builder, nothing to drift.
 *
 * Spec decision: the answer-first format emits a FAQPage JSON-LD block, which
 * is most of the AI-citation win the 6-Week plan doc is after.
 */
import type { Faq } from '@/lib/content/faqs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Total. Anything that is not a clean {question, answer} pair is dropped. */
export function parsePostFaq(value: unknown): Faq[] {
  if (!Array.isArray(value)) return [];

  const out: Faq[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const { question, answer } = entry;
    if (typeof question !== 'string' || typeof answer !== 'string') continue;

    const q = question.trim();
    const a = answer.trim();
    if (q === '' || a === '') continue;

    out.push({ question: q, answer: a });
  }
  return out;
}
