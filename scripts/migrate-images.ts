/**
 * Image migration: Squarespace CDN → local /public/images/
 *
 * Runs:    pnpm migrate:images
 * Idempotent: re-running skips already-downloaded files.
 * Failures (non-200) are logged to migration-report.json, NOT thrown.
 *
 * Inputs:
 *   - docs/CONTENT-AUDIT.md (URL source-of-truth)
 * Outputs:
 *   - public/images/<slug>            (downloaded asset)
 *   - lib/images/map.json             (squarespaceUrl → /images/<slug>)
 *   - lib/images/migration-report.json (ok[], failed[{url,status}])
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.dirname(path.dirname(__filename));
const PUBLIC_DIR = path.join(REPO_ROOT, 'public', 'images');
const MAP_DIR = path.join(REPO_ROOT, 'lib', 'images');
const MAP_PATH = path.join(MAP_DIR, 'map.json');
const REPORT_PATH = path.join(MAP_DIR, 'migration-report.json');
const AUDIT_PATH = path.join(REPO_ROOT, 'docs', 'CONTENT-AUDIT.md');

// Robust regex: capture URL until first whitespace, quote, backtick, or close-paren.
const URL_RE = /https:\/\/[^\s"'`<>)]*(?:squarespace-cdn|static1\.squarespace)[^\s"'`<>)]*/g;

type ReportEntry = { url: string; status?: number; error?: string };
type Report = { ok: string[]; failed: ReportEntry[]; skipped: string[] };

function slugFromUrl(url: string): string {
  // Strip query string first
  const noQuery = url.split('?')[0];
  // Last path segment, decoded
  let last: string;
  try {
    last = decodeURIComponent(noQuery.split('/').pop() ?? 'unnamed');
  } catch {
    last = noQuery.split('/').pop() ?? 'unnamed';
  }
  // Slugify
  return last
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithRetry(url: string): Promise<Response | { error: string }> {
  const TIMEOUT_MS = 10_000;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
      clearTimeout(timer);
      // Retry on 5xx once
      if (res.status >= 500 && res.status < 600 && attempt === 1) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      if (attempt === 2) {
        const msg = e instanceof Error ? e.message : String(e);
        return { error: msg };
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return { error: 'exhausted retries' };
}

async function downloadOne(url: string, report: Report): Promise<string | null> {
  const filename = slugFromUrl(url);
  if (!filename || filename === '.' || filename === '-') {
    report.failed.push({ url, error: 'empty filename after slugify' });
    return null;
  }
  const localPath = path.join(PUBLIC_DIR, filename);
  const publicHref = `/images/${filename}`;

  if (await fileExists(localPath)) {
    report.skipped.push(url);
    return publicHref; // idempotent
  }

  const res = await fetchWithRetry(url);
  if ('error' in res) {
    report.failed.push({ url, error: res.error });
    return null;
  }

  if (res.status !== 200) {
    report.failed.push({ url, status: res.status });
    return null;
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength < 1024) {
    // Suspiciously small — likely an error page disguised as the asset.
    report.failed.push({
      url,
      status: res.status,
      error: `tiny payload (${buf.byteLength} bytes)`,
    });
    return null;
  }

  await fs.writeFile(localPath, buf);
  report.ok.push(url);
  return publicHref;
}

async function main() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.mkdir(MAP_DIR, { recursive: true });

  const audit = await fs.readFile(AUDIT_PATH, 'utf8');
  const urls = Array.from(new Set(audit.match(URL_RE) ?? []));

  console.log(`Found ${urls.length} unique Squarespace CDN URLs in CONTENT-AUDIT.md`);

  const map: Record<string, string> = {};
  const report: Report = { ok: [], failed: [], skipped: [] };

  // Preserve any existing map entries (e.g., manual additions outside audit).
  if (await fileExists(MAP_PATH)) {
    try {
      const existing = JSON.parse(await fs.readFile(MAP_PATH, 'utf8')) as Record<string, string>;
      Object.assign(map, existing);
    } catch {
      /* corrupt or empty — ignore */
    }
  }

  // Sequential download — respectful to the CDN, easier to debug.
  for (const url of urls) {
    const local = await downloadOne(url, report);
    if (local) map[url] = local;
  }

  await fs.writeFile(MAP_PATH, JSON.stringify(map, null, 2) + '\n');
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

  console.log(
    `OK: ${report.ok.length} downloaded · ${report.skipped.length} skipped (already present) · ${report.failed.length} failed`,
  );
  if (report.failed.length) {
    console.warn(
      `Failures logged to ${path.relative(REPO_ROOT, REPORT_PATH)} — triage and re-run.`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
