/**
 * About page — /about
 *
 * Server Component. Sections:
 *  1. Hero banner — Nicole portrait + "About Nicole" heading
 *  2. Meet Nicole video block — placeholder slot with TODO comment
 *  3. Bio copy — verbatim from CONTENT-AUDIT.md §About
 *  4. "Not Sure Where to Start?" CTA section
 *
 * Copy: verbatim from CONTENT-AUDIT.md §About Page.
 * Geography: Carlsbad or North County San Diego — no old city references.
 */
import type { Metadata } from 'next';
import Image from 'next/image';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Label } from '@/components/ui/Label';
import { Pill } from '@/components/ui/Pill';
import { image } from '@/lib/images';
import { IMG_ABOUT_PORTRAIT } from '@/lib/images/keys';

export const metadata: Metadata = {
  title: 'About Nicole Hansult',
  description:
    'Functional longevity coach with 25+ years of experience in Carlsbad, CA. Meet Nicole Hansult.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app'}/about`,
  },
  openGraph: {
    title: 'About Nicole Hansult',
    description:
      'Functional longevity coach with 25+ years of experience in Carlsbad, CA. Meet Nicole Hansult.',
  },
};

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        {/* 1. Hero banner */}
        <section className="relative bg-bgAlt px-6 pt-32 pb-20 md:pt-40">
          <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Label>Functional longevity · Carlsbad, CA</Label>
              <h1 className="text-ink text-5xl md:text-6xl font-light leading-[1.05]">
                About Nicole
              </h1>
              <p className="text-inkSoft text-lg max-w-md">
                I&apos;ve spent more than 25 years working at the intersection of
                physical therapy, personal training, sports performance, injury
                rehabilitation, and integrative health across Europe, Asia, and
                the United States.
              </p>
            </div>
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-cardSoft">
              <Image
                src={image(IMG_ABOUT_PORTRAIT)}
                alt="Nicole Hansult, functional longevity coach in Carlsbad, CA"
                fill
                quality={85}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>

        {/* 2. Meet Nicole video block — vertical video left, copy right (flipped from hero) */}
        <section className="bg-bg px-6 py-20">
          <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-cardSoft mx-auto w-full max-w-xs sm:max-w-sm">
              <video
                src="/videos/nicole-about.mp4"
                controls
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="space-y-6">
              <Label>In her own words</Label>
              <h2 className="text-ink text-4xl md:text-5xl font-light leading-tight">
                Meet Nicole
              </h2>
              <p className="text-inkSoft text-base">
                I know how overwhelming it can feel when your body starts
                changing and what used to work no longer does.
              </p>
              <p className="text-inkSoft text-base">
                In this short video, I share more about my story, philosophy,
                and approach to longevity — and why I work the way I do.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Bio copy — verbatim from audit */}
        <section className="bg-bgAlt px-6 py-20">
          <div className="mx-auto max-w-4xl space-y-12">
            {/* Opening */}
            <div className="space-y-6">
              <h2 className="text-ink text-3xl md:text-4xl font-light leading-tight">
                Why I Work This Way
              </h2>
              <p className="text-inkSoft text-base">
                Many of my clients come to me feeling frustrated, confused,
                embarrassed, or disconnected from their bodies.
              </p>
              <p className="text-inkSoft text-base">
                Others are former athletes or active adults who want to maintain
                their strength, mobility, and independence as their bodies change
                with age.
              </p>
              <p className="text-inkSoft text-base">
                What used to work no longer works.
              </p>
              <p className="text-inkSoft text-base">
                They feel stiff, achy, low on energy, or less confident in their
                bodies. And often, they&apos;ve tried to &ldquo;figure it out&rdquo; on their
                own or ignored it, hoping it would go away.
              </p>
              <p className="text-inkSoft text-base">
                But the issue is rarely effort. It&apos;s a lack of clarity and the
                right strategy.
              </p>
              <p className="text-ink text-base font-medium">
                That&apos;s why my work is focused on helping you understand what your
                body actually needs — so you can move forward with confidence.
              </p>
            </div>

            {/* A Different Approach */}
            <div className="space-y-6">
              <h2 className="text-ink text-3xl md:text-4xl font-light leading-tight">
                A Different Approach
              </h2>
              <p className="text-inkSoft text-base">
                I don&apos;t believe in pushing you harder or putting you through
                generic programs.
              </p>
              <p className="text-inkSoft text-base">
                My approach is precise, structured, and adapted to you.
              </p>
              <p className="text-inkSoft text-base">
                When something hurts, there&apos;s usually a reason. Often, it comes
                from repetitive movement patterns, compensation, weakness,
                mobility restrictions, or how the body has adapted over time.
              </p>
              <p className="text-inkSoft text-base">
                Part of my work is helping you understand why your body feels the
                way it does, so we can address the root cause rather than just
                the symptom.
              </p>
              <p className="text-inkSoft text-base italic">
                (Yes — this is where a little German engineering comes in.)
              </p>
              <p className="text-inkSoft text-base">
                But it&apos;s also practical. Because your plan has to fit your real
                life, not the other way around.
              </p>
            </div>

            {/* Bio break image — interrupts the wall of text */}
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-cardSoft">
              <Image
                src="/images/nicole-about-break-marcy-browe.jpg"
                alt="Nicole Hansult coaching a client in Carlsbad CA"
                fill
                quality={85}
                sizes="(max-width: 768px) 100vw, 896px"
                className="object-cover"
              />
            </div>

            {/* Who I Work With */}
            <div className="space-y-6">
              <h2 className="text-ink text-3xl md:text-4xl font-light leading-tight">
                Who I Work With
              </h2>
              <p className="text-inkSoft text-base">
                Many of the people I work with:
              </p>
              <ul className="space-y-2 text-inkSoft text-base">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>have never connected with traditional fitness</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>are starting again after years of inconsistency</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    are high-performing adults who have built successful careers
                    or businesses but feel like their energy and vitality no
                    longer match their professional achievements
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    want to maintain their mobility, strength, independence, and
                    quality of life as they age, including active seniors and
                    those recovering from injury or surgery
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    are active or former athletes navigating new physical
                    limitations or recovery challenges
                  </span>
                </li>
              </ul>
              <p className="text-inkSoft text-base">
                Often, they&apos;re dealing with stiffness, recurring aches,
                compensation patterns, or injuries that have never fully
                resolved.
              </p>
              <p className="text-inkSoft text-base">
                My role is to help them understand why their body feels the way
                it does and create a clear plan to improve it.
              </p>
              <p className="text-ink text-base font-medium">
                You don&apos;t need to be &ldquo;in shape&rdquo; to start. You just need to be
                ready to approach your health differently.
              </p>
            </div>

            {/* What This Work Helps You Do */}
            <div className="space-y-6">
              <h2 className="text-ink text-3xl md:text-4xl font-light leading-tight">
                What This Work Helps You Do
              </h2>
              <p className="text-inkSoft text-base">
                Together, we focus on helping you:
              </p>
              <ul className="space-y-2 text-inkSoft text-base">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>improve mobility, posture, and strength</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    understand your body composition and energy patterns
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    build sustainable habits that actually fit your life
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>feel more confident and capable in your body again</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>stay consistent even when motivation fluctuates</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    stop guessing and follow a clear strategy that works for
                    your body
                  </span>
                </li>
              </ul>
              <p className="text-inkSoft text-base">
                Not through extremes. Through clarity, consistency, and the
                right strategy.
              </p>
            </div>

            {/* Education & Certifications */}
            <div className="space-y-6">
              <h2 className="text-ink text-3xl md:text-4xl font-light leading-tight">
                Education &amp; Certifications
              </h2>
              <p className="text-inkSoft text-base">
                Nicole&apos;s background combines physiotherapy-based movement,
                rehabilitation, nutrition, and integrative health training from
                Europe, Asia, and the United States.
              </p>
              <ul className="space-y-2 text-inkSoft text-base">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    Diploma in Physical Therapy — Bruederkrankenhaus, St.
                    Joseph, Koblenz, Germany
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Transformational Mastery Coach</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    Health Coach (Health Coach Institute — CCE International
                    Coach Education)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    Diploma in Nutrition — Alice-Salomon Schule, Linz am Rhein,
                    Germany
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    NASM (National Academy of Sports Medicine) Certified
                    Personal Trainer
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>NASM Certified Performance Enhancement Specialist</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    Certification in Kinesiology — Seminarzentrum in Neumarkt,
                    Germany
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    Reiki Healing Practitioner Level 1 and 2 — Katt Lowe in
                    Los Angeles, CA
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    Certification in Rehabilitation Training —
                    Arbeitsgemeinschaft Medizinisches Aufbautraining in
                    Mannheim, Germany
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Certification in CPR / AED</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    APS (Australian Physical Therapy Association) Certification
                    in Clinical Pilates For Pathologies
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>
                    Certificate on TMJ Treatment — Medizinische Hochschule in
                    Hannover, Germany
                  </span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Diploma in Shotokan Karate 3rd KYU (Hong Kong)</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. "Not Sure Where to Start?" CTA section */}
        <section className="bg-bg px-6 py-20">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <h2 className="text-ink text-3xl md:text-4xl font-light leading-tight">
              Not Sure Where to Start?
            </h2>
            <p className="text-inkSoft text-lg">
              Book a Clinical Longevity Evaluation — the clearest way to begin.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Pill href="/booking-appointment" variant="orchid" size="lg">
                Book a Clinical Longevity Evaluation
              </Pill>
              <Pill href="/services" variant="ghost" size="lg">
                Explore services
              </Pill>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
