import Link from 'next/link';

export function DisclaimerBand() {
  return (
    <div className="bg-bgAlt border-t border-inkFaint px-6 py-4">
      <p className="mx-auto max-w-6xl text-xs text-inkSoft">
        The information on this site is for informational purposes only and does not constitute medical advice.{' '}
        <Link href="/medical-disclaimer" className="underline hover:text-ink">Full disclaimer</Link>.
      </p>
    </div>
  );
}
