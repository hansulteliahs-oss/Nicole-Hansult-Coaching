/**
 * Orb — design-2.md §3.4
 *
 * Decorative radial-gradient orb. Inline styles allowed here (one-off
 * gradient that doesn't fit Tailwind utilities cleanly — see CONTEXT.md).
 *
 * Use as an absolutely-positioned accent inside hero sections; defaults
 * to 360px and is `pointer-events: none` so it never blocks interactivity.
 */
export function Orb({
  className,
  size = 360,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 30% 30%, #EFD8EB 0%, #D9EEF7 45%, #EBE6DE 75%)',
        filter: 'blur(40px)',
        opacity: 0.85,
        pointerEvents: 'none',
      }}
      aria-hidden
    />
  );
}
