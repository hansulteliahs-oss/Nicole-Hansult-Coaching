/**
 * posts.faq is jsonb written by an LLM. It reaches the public site and the
 * structured data, so it is parsed defensively: a bad shape must render an
 * empty section, never crash /insights/[slug].
 */
import { describe, it, expect } from 'vitest';

import { parsePostFaq } from '@/lib/content/postFaq';
import { faqPageSchema } from '@/lib/content/faqs';

describe('parsePostFaq', () => {
  it('parses a well-formed array', () => {
    expect(
      parsePostFaq([
        { question: 'Is it arthritis?', answer: 'Usually not.' },
        { question: 'Should I stop stairs?', answer: 'No.' },
      ]),
    ).toEqual([
      { question: 'Is it arthritis?', answer: 'Usually not.' },
      { question: 'Should I stop stairs?', answer: 'No.' },
    ]);
  });

  it('returns [] for null, a string, an object, or a JSON string', () => {
    expect(parsePostFaq(null)).toEqual([]);
    expect(parsePostFaq('nope')).toEqual([]);
    expect(parsePostFaq({ question: 'a', answer: 'b' })).toEqual([]);
    expect(parsePostFaq(undefined)).toEqual([]);
  });

  it('drops entries missing a question or an answer instead of rendering blanks', () => {
    expect(
      parsePostFaq([
        { question: 'Good', answer: 'Yes' },
        { question: 'No answer' },
        { answer: 'No question' },
        { question: '   ', answer: 'blank' },
        'not an object',
        null,
      ]),
    ).toEqual([{ question: 'Good', answer: 'Yes' }]);
  });

  it('trims whitespace', () => {
    expect(parsePostFaq([{ question: '  Q  ', answer: '  A  ' }])).toEqual([
      { question: 'Q', answer: 'A' },
    ]);
  });

  it('feeds the existing faqPageSchema unchanged', () => {
    const schema = faqPageSchema(parsePostFaq([{ question: 'Q', answer: 'A' }]));
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'Q',
        acceptedAnswer: { '@type': 'Answer', text: 'A' },
      },
    ]);
  });

  it('caps at 12 entries — an LLM run-on must not reach the public page or its JSON-LD', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      question: `Question ${i}`,
      answer: `Answer ${i}`,
    }));
    const result = parsePostFaq(many);
    expect(result).toHaveLength(12);
    expect(result[0].question).toBe('Question 0');
    expect(result[11].question).toBe('Question 11');
  });

  it('dedupes by question, keeping the first answer given', () => {
    expect(
      parsePostFaq([
        { question: 'Is it arthritis?', answer: 'Usually not.' },
        { question: 'Is it arthritis?', answer: 'A different answer the second time.' },
        { question: 'Should I stop stairs?', answer: 'No.' },
      ]),
    ).toEqual([
      { question: 'Is it arthritis?', answer: 'Usually not.' },
      { question: 'Should I stop stairs?', answer: 'No.' },
    ]);
  });
});
