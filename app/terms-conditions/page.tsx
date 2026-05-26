/**
 * /terms-conditions — Terms & Conditions (verbatim from CONTENT-AUDIT.md)
 *
 * Server Component. Long-form prose in readable content width.
 */
import type { Metadata } from 'next';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and conditions for Nicole Hansult Coaching.',
  alternates: { canonical: `${BASE_URL}/terms-conditions` },
};

export default function TermsConditionsPage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        <article className="mx-auto max-w-3xl px-6 py-24">
          <h1 className="font-serif text-4xl text-ink mb-10">Terms &amp; Conditions</h1>

          <div className="space-y-8 text-ink text-base leading-relaxed">
            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Agreement to Terms</h2>
              <p>
                By accessing or using this Website, you agree to comply with and be bound by these
                Terms. If you do not agree, please do not use our Website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Prohibited Activities</h2>
              <p>Users shall not:</p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-inkSoft">
                <li>Engage in fraudulent, harmful, or abusive behavior</li>
                <li>Violate intellectual property rights</li>
                <li>Distribute spam, malware, or unauthorized promotions</li>
                <li>Interfere with the Website&apos;s operation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Payments &amp; Refunds</h2>
              <p>If you purchase a program, service, or product from us:</p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-inkSoft">
                <li>All payments are due at the time of purchase</li>
                <li>
                  We reserve the right to change pricing or discontinue products at any time
                </li>
                <li>Refund policies are specified in individual product descriptions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Disclaimer of Warranties</h2>
              <p>We do not warrant that:</p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-inkSoft">
                <li>The Website will always be available, secure, or error-free</li>
                <li>Any results promised in programs or content will be achieved</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Limitation of Liability</h2>
              <p>Nicole Hansult Coaching is not liable for:</p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-inkSoft">
                <li>
                  Any injuries, damages, or losses resulting from the use of our Website, content,
                  or programs
                </li>
                <li>
                  Any third-party links, products, or services referenced on this Website
                </li>
                <li>
                  Our liability shall not exceed the amount you paid for any services or products
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Third-Party Links</h2>
              <p>
                Our Website may contain links to third-party websites. We do not control or endorse
                their content and are not responsible for their policies or practices.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Termination</h2>
              <p>
                We reserve the right to suspend or terminate your access to the Website if you:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-inkSoft">
                <li>Violate these Terms</li>
                <li>Engage in harmful or illegal activity</li>
                <li>Use our content improperly</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Updates to Terms</h2>
              <p>
                We may update these Terms from time to time. Any changes will be posted on this page
                with an updated &ldquo;Effective Date.&rdquo; Continued use of the Website means you
                accept the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Governing Law</h2>
              <p>
                These Terms shall be governed by and interpreted in accordance with the laws of
                California, without regard to conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at{' '}
                <a
                  href="mailto:nicole@nicolehansultcoaching.com"
                  className="text-orchid underline underline-offset-2"
                >
                  nicole@nicolehansultcoaching.com
                </a>
                .
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
