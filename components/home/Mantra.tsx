/**
 * Mantra — design-2.md §4 home composition, section 2.
 *
 * Single-line italic-serif band over a sky→orchid linear gradient.
 * Inline gradient style is allowed per CONTEXT.md (one of the two named
 * gradients reserved for the design system — the other is the logomark dot).
 */
export function Mantra() {
  return (
    <section
      className="px-6 py-20 text-center"
      style={{
        background:
          'linear-gradient(135deg, #D9EEF7 0%, #EFD8EB 100%)',
      }}
    >
      <p className="text-ink text-3xl md:text-4xl font-serif italic max-w-3xl mx-auto leading-tight">
        Strength is a long game. Show up for it.
      </p>
    </section>
  );
}
