/**
 * FAQ content — ported verbatim from the live Squarespace site.
 *
 * Source pages:
 *   - cleFaqs       → /services/clinical-longevity-evaluation (now /services)
 *   - vibrant40Faqs → /services/vibrant40-jumpstart-enroll
 *
 * Used both for the rendered <FaqSection /> accordion and to generate the
 * FAQPage JSON-LD (via faqPageSchema), so the visible copy and the structured
 * data can never drift apart.
 */
export interface Faq {
  question: string;
  answer: string;
}

export const cleFaqs: ReadonlyArray<Faq> = [
  {
    question: "What if the results show something isn't ideal?",
    answer:
      "That's exactly why we do the evaluation. Most people already sense that something in their body feels different — they just don't have clear information about what's actually happening. The purpose of the scan and assessment is not to judge or criticize. It's to give us insight so we can build a practical plan that improves how your body functions over time. Many clients actually feel relieved once they understand what their body needs and realize there are clear steps they can take to improve it.",
  },
  {
    question: "What if I haven't exercised in years?",
    answer:
      "You're in the right place. Many of my clients are returning to movement after long breaks. The goal is not intensity — it's building a foundation.",
  },
  {
    question: 'Do I need to be fit to start?',
    answer:
      'Absolutely not. This evaluation is designed for people who feel unsure where to begin. We start exactly where you are.',
  },
  {
    question: 'I have an old injury. Is this safe?',
    answer:
      'Yes. My background is in physiotherapy-based movement training, and the assessment is designed to be safe and appropriate for your current condition.',
  },
  {
    question:
      "I'm currently doing physical therapy or following a program. Should I wait until I'm done?",
    answer:
      "No—this is actually one of the best times to do the evaluation. We can capture a clear baseline of how your body is functioning right now and identify any underlying imbalances that may still be present. It also gives you a way to measure real progress over time—not just how you feel, but what's actually changing in your body.",
  },
  {
    question:
      "I'm taking a GLP-1 medication and have lost weight. How do I maintain it without losing strength?",
    answer:
      'This is exactly where a more precise approach becomes important. While weight loss can happen quickly with medication, it often includes loss of muscle along with fat. The evaluation allows us to see your current muscle balance, metabolism, and overall body composition so we can focus on maintaining strength, supporting your metabolism, and protecting your long-term health.',
  },
  {
    question: "I'm currently dieting or trying to lose weight. Should I wait?",
    answer:
      "You don't need to wait. The evaluation helps us understand how your body is responding right now—so we can support your efforts more effectively. Instead of guessing, we can see what's actually happening beneath the surface and adjust your approach in a way that supports long-term results.",
  },
  {
    question:
      "I want to lose some weight before coming in. Should I wait until I'm closer to my goal?",
    answer:
      "There's no need to wait. In fact, starting now gives us a clear understanding of your current baseline so we can guide your progress more effectively. Your body doesn't need to be at a certain point to begin—this is where we create a plan that helps you move forward with clarity and confidence.",
  },
  {
    question: 'What should I wear?',
    answer:
      'Something comfortable that allows you to move easily. Gym clothes are not required.',
  },
];

export const vibrant40Faqs: ReadonlyArray<Faq> = [
  {
    question: 'Do I need to be fit to start this?',
    answer:
      'Nope. This program is designed for beginners or those getting back on track after time off.',
  },
  {
    question: 'How much time will it take each day?',
    answer:
      'About 15–20 minutes, max. Movement sessions are short, and everything is self-paced.',
  },
  {
    question: 'Is this just for women?',
    answer:
      "No! While many of Nicole's clients are women over 40, this program is effective and inclusive for men, too.",
  },
  {
    question: 'What if I miss a day?',
    answer:
      "No problem. This isn't about being perfect. It's about continuing to show up for yourself.",
  },
];

/** Build FAQPage JSON-LD from a list of FAQs (keeps schema in sync with copy). */
export function faqPageSchema(faqs: ReadonlyArray<Faq>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
