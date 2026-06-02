/**
 * /testimonials — Client Results page
 *
 * Server Component. Maps testimonialVideos for embed / placeholder.
 * Greg R.'s Squarespace-MP4 source renders as a placeholder (no CDN URL).
 * Social proof badges rendered as text chips — no external image URLs.
 */
import type { Metadata } from 'next';
import Image from 'next/image';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Pill } from '@/components/ui/Pill';
import { testimonialVideos } from '@/lib/content/testimonials';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  title: 'Client Results',
  description:
    'Real results from real clients working with Nicole Hansult — functional longevity coaching in Carlsbad, CA.',
  alternates: { canonical: `${BASE_URL}/testimonials` },
};

const SOCIAL_PROOF_BADGES = [
  'Google Reviews 5-Star',
  'Yelp Reviews 5-Star',
  'Best Personal Trainer North County 2024',
  'Best Local Fitness Influencer 2024',
];

// Review destinations — direct to the live review pages.
// Google: canonical Maps listing via CID (resolves to "Nicole Hansult Coaching - Google Maps").
const GOOGLE_REVIEWS_URL = 'https://www.google.com/maps?cid=2333186323496371205';
const YELP_REVIEWS_URL = 'https://www.yelp.com/biz/nicole-hansult-coaching-encinitas';

export default function TestimonialsPage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        {/* Hero banner — scraped from live site (functional-group-training-carlsbad) */}
        <section className="mx-auto max-w-6xl px-6 pt-28 md:pt-32">
          <div className="relative aspect-[1280/720] w-full overflow-hidden rounded-2xl">
            <Image
              src="/images/functional-group-training-carlsbad.jpg"
              alt="Nicole Hansult leading a functional group training session in Carlsbad, CA"
              fill
              priority
              sizes="(max-width: 1152px) 100vw, 1152px"
              className="object-cover"
            />
          </div>
        </section>

        {/* Hero heading */}
        <section className="mx-auto max-w-5xl px-6 pt-10 md:pt-12 pb-12 text-center">
          <h1 className="font-serif text-4xl text-ink md:text-5xl">
            Real People. Real Results.
          </h1>
          <p className="mt-4 text-inkSoft text-lg max-w-2xl mx-auto">
            Every client starts from a different place. These stories reflect what&apos;s
            possible with the right strategy, guidance, and support.
          </p>

          {/* Social proof badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {SOCIAL_PROOF_BADGES.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded-pill px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] bg-skySoft text-skyDeep"
              >
                {badge}
              </span>
            ))}
          </div>
        </section>

        {/* Video testimonials */}
        <section className="mx-auto max-w-5xl px-6 pb-16">
          <h2 className="text-2xl font-medium text-ink mb-8 text-center">
            Hear It in Their Own Words
          </h2>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            {testimonialVideos.map((video) => (
              <div key={video.slug} className="flex flex-col gap-3">
                {video.source.kind === 'youtube' ? (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.source.youtubeId}`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : (
                  /* Greg R. — Squarespace MP4 placeholder (CDN dies when Squarespace is cancelled) */
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-inkFaint flex items-center justify-center">
                    <p className="text-sm text-inkSoft">Greg R. video — re-hosting in progress</p>
                  </div>
                )}
                <p className="text-ink font-medium text-sm">
                  {video.name}
                  {video.location && (
                    <span className="text-inkSoft font-normal"> — {video.location}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Written testimonials — Move Better section */}
        <section className="bg-card mx-auto max-w-5xl rounded-2xl mx-6 md:mx-auto px-8 py-12 mb-10">
          <h2 className="text-2xl font-medium text-ink mb-2">Move Better. Recover From Pain.</h2>
          <p className="text-inkSoft mb-6">
            Many clients initially come to Nicole because something hurts: chronic stiffness,
            recurring injuries, limited mobility, poor posture, or pain that traditional approaches
            haven&apos;t fully resolved.
          </p>
          <div className="space-y-4">
            {[
              { quote: 'After three sessions, my shoulder was completely pain-free and I was back in the gym lifting again.', attr: 'Ray B., Del Mar, CA' },
              { quote: "With Nicole's guidance, my posture improved and my pain disappeared.", attr: 'Karen S., North County San Diego' },
              { quote: 'Nicole guided me through every step of my recovery after hip replacement surgery.', attr: 'Mike S., Carlsbad, CA' },
            ].map(({ quote, attr }) => (
              <blockquote key={attr} className="border-l-2 border-orchid pl-4">
                <p className="text-ink leading-relaxed">&ldquo;{quote}&rdquo;</p>
                <footer className="mt-1 text-xs text-inkSoft">— {attr}</footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* Section image — scraped from live site (functional-training-over-40-carlsbad) */}
        <section className="mx-auto max-w-5xl px-6 pb-12">
          <div className="relative aspect-[1280/720] w-full overflow-hidden rounded-2xl">
            <Image
              src="/images/functional-training-over-40-carlsbad.jpg"
              alt="Nicole Hansult guiding a client through strength training and functional movement for healthy aging after 40"
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        </section>

        {/* Strength, Confidence & Energy */}
        <section className="mx-auto max-w-5xl px-6 pb-10">
          <h2 className="text-2xl font-medium text-ink mb-2">Strength, Confidence &amp; Energy</h2>
          <p className="text-inkSoft mb-6">
            For many clients, the goal isn&apos;t just weight loss. It&apos;s feeling stronger,
            more energized, and more confident in their body again.
          </p>
          <div className="space-y-4">
            {[
              { quote: "I'm at my ideal weight and continue to grow stronger and build muscle daily.", attr: 'Jayne C., Encinitas, CA' },
              { quote: "She helped me realize I'm stronger than I think.", attr: 'Hillary S., Encinitas, CA' },
              { quote: 'What I learned from Nicole completely changed my life for the long haul.', attr: 'Brie M., Carlsbad, CA' },
              { quote: "I feel stronger, more confident, and I've seen real progress.", attr: 'Monica B., Encinitas, CA' },
            ].map(({ quote, attr }) => (
              <blockquote key={attr} className="border-l-2 border-sky pl-4">
                <p className="text-ink leading-relaxed">&ldquo;{quote}&rdquo;</p>
                <footer className="mt-1 text-xs text-inkSoft">— {attr}</footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* Section image — scraped from live site (active-aging-strength-and-mobility-over-40) */}
        <section className="mx-auto max-w-5xl px-6 pb-12">
          <div className="relative aspect-[1280/720] w-full overflow-hidden rounded-2xl">
            <Image
              src="/images/active-aging-strength-and-mobility-over-40.jpg"
              alt="Nicole Hansult leading a beach workout focused on strength, mobility, and active aging for adults over 40"
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        </section>

        {/* Aging & Staying Active */}
        <section className="mx-auto max-w-5xl px-6 pb-10">
          <h2 className="text-2xl font-medium text-ink mb-2">Aging &amp; Staying Active</h2>
          <p className="text-inkSoft mb-2">
            Many of Nicole&apos;s clients are active adults or former athletes who want to
            maintain mobility, strength, balance, and independence as they age.
          </p>
          <p className="text-inkSoft mb-6">
            The goal isn&apos;t simply to exercise more. It&apos;s to stay strong, mobile, and
            fully engaged in the life you want to live.
          </p>
          <div className="space-y-4">
            {[
              { quote: 'Nicole doesn’t just train bodies, she transforms lives.', attr: 'Enid, Encinitas, CA' },
              { quote: 'I intend to be a client for the rest of my life.', attr: 'Linda G., Encinitas, CA' },
              { quote: 'My mobility improved and I can walk more confidently with much less pain.', attr: 'Karin S., Encinitas, CA' },
              { quote: "Every detail was thoughtfully executed. We're thrilled with the outcome.", attr: 'Greg R., Carlsbad, CA' },
            ].map(({ quote, attr }) => (
              <blockquote key={attr} className="border-l-2 border-orchid pl-4">
                <p className="text-ink leading-relaxed">&ldquo;{quote}&rdquo;</p>
                <footer className="mt-1 text-xs text-inkSoft">— {attr}</footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* Recognition — award badges + clickable Google/Yelp review logos (scraped from live site) */}
        <section className="bg-card mx-auto max-w-5xl rounded-2xl mx-6 md:mx-auto px-8 py-12 mb-10 text-center">
          <h2 className="text-2xl font-medium text-ink mb-2">Recognition &amp; Reviews</h2>
          <h3 className="text-base font-medium text-inkSoft mb-8">
            5-Star Rated by Clients Across North County San Diego
          </h3>

          {/* Award badges */}
          <div className="flex flex-wrap items-center justify-center gap-8">
            <Image
              src="/images/best-personal-trainer-north-county-2024-nicole-hansult.png"
              alt="Winner — North County San Diego Best Personal Trainer 2024"
              width={140}
              height={140}
              className="h-28 w-28 md:h-32 md:w-32 object-contain"
            />
            <Image
              src="/images/best-local-fitness-influencer-2024-nicole-hansult.png"
              alt="Best Local Fitness Influencer 2024"
              width={140}
              height={140}
              className="h-28 w-28 md:h-32 md:w-32 object-contain"
            />
          </div>

          {/* 5-star strip */}
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block transition-opacity hover:opacity-80"
          >
            <Image
              src="/images/5-star-client-reviews-nicole-hansult.png"
              alt="Five-star client reviews for Nicole Hansult"
              width={266}
              height={50}
              className="h-auto w-56 object-contain"
            />
          </a>

          {/* Clickable Google + Yelp review logos */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-10">
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Read Nicole Hansult's 5-star Google reviews"
              className="transition-opacity hover:opacity-80"
            >
              <Image
                src="/images/google-reviews-nicole-hansult.png"
                alt="Read Nicole Hansult's 5-star Google reviews"
                width={120}
                height={107}
                className="h-16 w-auto object-contain"
              />
            </a>
            <a
              href={YELP_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Read Nicole Hansult's 5-star Yelp reviews"
              className="transition-opacity hover:opacity-80"
            >
              <Image
                src="/images/yelp-reviews-nicole-hansult.png"
                alt="Read Nicole Hansult's 5-star Yelp reviews"
                width={106}
                height={106}
                className="h-16 w-auto object-contain"
              />
            </a>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-3xl font-serif text-ink mb-4">
            Ready to start your own story?
          </h2>
          <p className="text-inkSoft mb-8">
            Whether your goal is to move without pain, rebuild strength, or better understand
            what your body needs as you age, the first step is gaining clarity.
          </p>
          <Pill href="/booking-appointment" variant="orchid" size="lg">
            Book Your Evaluation
          </Pill>
        </section>
      </main>
      <Footer />
    </>
  );
}
