import type { Metadata } from 'next';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { site } from '@/lib/content/site';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  title: 'Book an Appointment',
  description:
    'Schedule a Clinical Longevity Evaluation or Strategy Session with Nicole Hansult in Carlsbad, CA.',
  alternates: { canonical: `${BASE_URL}/booking-appointment` },
  openGraph: {
    title: 'Book an Appointment — Nicole Hansult Coaching',
    description:
      'Schedule a Clinical Longevity Evaluation or Strategy Session with Nicole Hansult in Carlsbad, CA.',
  },
};

const acuitySrc = `https://app.acuityscheduling.com/schedule.php?owner=${site.acuity.ownerId}`;

export default function BookingAppointmentPage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        <section className="mx-auto max-w-3xl px-6 pt-32 md:pt-40 pb-12">
          <h1 className="text-4xl font-light mb-4">Book a Session</h1>
          <p className="text-inkSoft text-lg leading-relaxed">
            Ready to take the next step? Use the scheduler below to book your Clinical Longevity
            Evaluation or 45-Minute Strategy Session. Choose the appointment type that fits where
            you are right now.
          </p>
        </section>
        <div className="mx-auto max-w-3xl px-6 pb-24">
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{ minHeight: '700px' }}
          >
            <iframe
              src={acuitySrc}
              title="Book an appointment with Nicole Hansult"
              width="100%"
              height="100%"
              className="absolute inset-0 w-full h-full border-0"
              frameBorder="0"
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
