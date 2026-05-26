/**
 * /privacy-policy — Privacy Policy (verbatim from CONTENT-AUDIT.md)
 *
 * Server Component. Long-form prose in readable content width.
 */
import type { Metadata } from 'next';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Nicole Hansult Coaching.',
  alternates: { canonical: `${BASE_URL}/privacy-policy` },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        <article className="mx-auto max-w-3xl px-6 py-24">
          <h1 className="font-serif text-4xl text-ink mb-10">Privacy Policy</h1>

          <div className="space-y-8 text-ink text-base leading-relaxed">
            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Your Privacy Matters</h2>
              <p>
                By using our Website, you consent to the practices described in this Privacy Policy.
                We collect two types of information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Information We Collect</h2>
              <p>
                When you interact with our Website, you may voluntarily provide personal information,
                including but not limited to:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-inkSoft">
                <li>Name</li>
                <li>Email address</li>
                <li>Phone number (if provided)</li>
                <li>Payment details (if purchasing a product or service)</li>
                <li>Any other information you provide via forms, sign-ups, or customer inquiries</li>
              </ul>
              <p className="mt-4">
                When you visit our Website, certain information is automatically collected:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-inkSoft">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Pages visited and time spent on the Website</li>
                <li>Referral source (how you found our Website)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Data Security</h2>
              <p>
                We take data security seriously and implement industry-standard measures to protect
                your personal information, including:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-inkSoft">
                <li>Secure hosting and encryption</li>
                <li>Limited access to personal data</li>
                <li>Regular security reviews and updates</li>
              </ul>
              <p className="mt-4">
                However, no method of transmission over the internet is 100% secure, and we cannot
                guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Cookies &amp; Tracking</h2>
              <p>
                Our Website may use cookies and tracking technologies to enhance user experience and
                collect usage data. You can choose to disable cookies in your browser settings, but
                some features of our Website may not function properly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Third-Party Services</h2>
              <p>
                We may use third-party services (such as email marketing providers, payment
                processors, and analytics tools) that collect, process, and store your data. These
                third parties have privacy policies that govern how they handle your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Email Communications</h2>
              <p>
                If you subscribe to our email list, we may send you newsletters, updates, and
                promotional emails. You can opt-out at any time by clicking the
                &ldquo;unsubscribe&rdquo; link in our emails or by contacting us directly at{' '}
                <a
                  href="mailto:nicole@nicolehansultcoaching.com"
                  className="text-orchid underline underline-offset-2"
                >
                  nicole@nicolehansultcoaching.com
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Your Rights</h2>
              <p>
                Depending on your location, you may have the following rights regarding your
                personal data:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-inkSoft">
                <li>Access your personal data</li>
                <li>Request corrections or updates</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, please contact us at{' '}
                <a
                  href="mailto:nicole@nicolehansultcoaching.com"
                  className="text-orchid underline underline-offset-2"
                >
                  nicole@nicolehansultcoaching.com
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Policy Updates</h2>
              <p>
                We may update this Privacy Policy periodically. Any changes will be posted on this
                page with an updated &ldquo;Effective Date.&rdquo; We encourage you to review this
                policy regularly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy or how we handle your data,
                please contact us at{' '}
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
