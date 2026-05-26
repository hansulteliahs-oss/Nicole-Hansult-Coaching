import map from './images/map.json';

const imageMap = map as Record<string, string>;

/**
 * Resolve a Squarespace CDN URL to a local /images/<slug> path.
 *
 * If the URL is not in the migration map (e.g., a new image discovered
 * after the last script run), returns the input URL unchanged so the
 * miss surfaces in DevTools instead of silently producing a broken image.
 *
 * Components should ALWAYS route image src values through this function,
 * never embed local /images/... paths directly — that way re-running the
 * migration updates components transparently.
 */
export function image(squarespaceUrl: string): string {
  return imageMap[squarespaceUrl] ?? squarespaceUrl;
}
