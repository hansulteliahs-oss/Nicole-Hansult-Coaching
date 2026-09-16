/**
 * Who a newsletter goes to, as a label and an approximate size.
 *
 * The approve pages used to show ~1,110 for every send. With segmented sends
 * (launch engaged, launch cold, the Sugar Cravings list) that number is wrong
 * more often than right, and "how many people does this press reach" is the
 * one thing the confirm step exists to say.
 *
 * Sizes are configuration, not a live Mailchimp call: this page must render
 * when Mailchimp is unreachable. List defaults are the counts read on
 * 2026-09-15. Segment sizes are unknown unless MAILCHIMP_AUDIENCE_SIZES
 * (a JSON map, keys `<list>` or `<list>:<segment>`) says otherwise, and the
 * page says "size not known" rather than inventing one.
 */
export type Audience = { label: string; approx: number | null };

export const KNOWN_LISTS: Record<string, { label: string; approx: number }> = {
  f531604a9a: { label: 'Main list', approx: 1157 },
  ecacfdabed: { label: 'Sugar Cravings list', approx: 150 },
  '26495cd895': { label: 'Vibrant40 list', approx: 2 },
  '1bf6240649': { label: '14 Day Reset list', approx: 2 },
};

export function audienceSizes(
  raw: string | undefined = process.env.MAILCHIMP_AUDIENCE_SIZES,
): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function describeAudience(
  listId: string,
  segmentId: string | null,
  sizes: Record<string, number> = audienceSizes(),
): Audience {
  const known = KNOWN_LISTS[listId];
  const listLabel = known ? known.label : `list ${listId}`;

  if (segmentId !== null && segmentId !== undefined && String(segmentId).trim() !== '') {
    const key = `${listId}:${segmentId}`;
    return {
      label: `${listLabel} · segment ${segmentId}`,
      approx: key in sizes ? sizes[key] : null,
    };
  }

  return {
    label: listLabel,
    approx: listId in sizes ? sizes[listId] : (known?.approx ?? null),
  };
}

export function audienceSentence(a: Audience): string {
  return a.approx === null
    ? `${a.label} (size not known here)`
    : `${a.label} (about ${a.approx.toLocaleString('en-US')} people)`;
}
