/**
 * Mantra — home page section 2: "When Your Body Starts Changing".
 *
 * Text-focused section with Mist gradient styling.
 * Copy: verbatim from CONTENT-AUDIT.md §Home Page §When Your Body Starts Changing.
 * Inline gradient style is allowed per CONTEXT.md (one of the two named gradients
 * reserved for the design system).
 */
export function Mantra() {
  return (
    <section
      className="px-6 py-20"
      style={{
        background: 'linear-gradient(135deg, #D9EEF7 0%, #EFD8EB 100%)',
      }}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <h2 className="text-ink text-3xl md:text-4xl font-light leading-tight">
          When Your Body Starts Changing
        </h2>
        <p className="text-inkSoft text-base">
          At some point after 40, many people notice things beginning to feel
          different.
        </p>
        <p className="text-inkSoft text-base">
          Using clinical data, mobility assessments, and 25+ years of movement
          expertise, I help you understand what your body needs and give you a
          clear, personalized plan.
        </p>
        <p className="text-ink text-base font-medium">You may feel:</p>
        <ul className="space-y-2 text-inkSoft text-base">
          <li className="flex gap-2">
            <span>•</span>
            <span>Stiffer getting out of bed</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>Less confident about your strength or energy</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>Frustrated that things that used to work no longer do</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>Unsure where to start — or whether it&apos;s even worth trying</span>
          </li>
        </ul>
        <p className="text-inkSoft text-base">
          And if you&apos;ve never considered yourself &ldquo;a fitness person,&rdquo; the
          idea of starting now can feel overwhelming.
        </p>
        <p className="text-inkSoft text-base">
          But the truth is: your body can improve at any stage when you
          understand how it works and give it the right support.
        </p>
        <p className="text-ink text-base font-medium">That&apos;s where I come in.</p>
      </div>
    </section>
  );
}
