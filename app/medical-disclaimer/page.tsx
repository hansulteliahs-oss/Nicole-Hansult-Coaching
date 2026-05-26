/**
 * /medical-disclaimer — Full medical disclaimer route
 *
 * Server Component. Linked from DisclaimerBand (global layout).
 * Content is a standard functional longevity coaching disclaimer —
 * the live site embeds this within Privacy Policy rather than a dedicated route.
 */
import type { Metadata } from 'next';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  title: 'Medical Disclaimer',
  description: 'Medical disclaimer for Nicole Hansult Coaching.',
  alternates: { canonical: `${BASE_URL}/medical-disclaimer` },
};

export default function MedicalDisclaimerPage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        <article className="mx-auto max-w-3xl px-6 py-24">
          <h1 className="font-serif text-4xl text-ink mb-10">Medical Disclaimer</h1>

          <div className="space-y-8 text-ink text-base leading-relaxed">
            <section>
              <h2 className="text-xl font-medium text-ink mb-3">For Educational Purposes Only</h2>
              <p>
                The information provided on this website, including articles, guides, videos, and
                program content, is intended for general informational and educational purposes only.
                It does not constitute medical advice, diagnosis, or treatment.
              </p>
              <p className="mt-3">
                Nothing on this site should be interpreted as a substitute for professional medical
                advice, diagnosis, or treatment from a qualified healthcare provider. Always consult
                your physician or another licensed healthcare professional before beginning any
                exercise program, nutrition plan, or health-related regimen — particularly if you
                have a pre-existing medical condition, recent injury, or are currently taking
                prescription medication.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Not a Medical Practice</h2>
              <p>
                Nicole Hansult is a certified functional longevity coach and personal trainer.
                She is <strong>not</strong> a licensed physician, registered dietitian, physical
                therapist, or other state-licensed healthcare provider. Services offered through
                Nicole Hansult Coaching are coaching and educational in nature, and are not intended
                to diagnose, treat, cure, or prevent any disease or medical condition.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Individual Results Vary</h2>
              <p>
                Results described in testimonials, case studies, and program materials represent
                individual experiences. Results are not guaranteed. Your results will vary based on
                many factors, including but not limited to your current health status, adherence to
                the program, lifestyle, genetics, and other individual circumstances.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Consult Your Doctor</h2>
              <p>
                Before starting any exercise, nutrition, or wellness program, we strongly recommend
                that you:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-1 text-inkSoft">
                <li>Consult with your physician or primary care provider</li>
                <li>Disclose any existing medical conditions or physical limitations</li>
                <li>Review any potential interactions with current medications</li>
                <li>
                  Seek clearance for exercise if you have cardiovascular, orthopedic, or other
                  health concerns
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">
                Stop Exercise if You Experience Discomfort
              </h2>
              <p>
                If at any point during exercise or participation in any program you experience pain,
                dizziness, shortness of breath, chest discomfort, or any other unusual symptom,
                stop immediately and seek medical attention.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Third-Party Content</h2>
              <p>
                This website may reference or link to third-party resources, research, or tools.
                Nicole Hansult Coaching does not endorse, warrant, or assume responsibility for the
                accuracy or completeness of any third-party content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-ink mb-3">Questions</h2>
              <p>
                If you have any questions about this disclaimer or our services, please contact us
                at{' '}
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
