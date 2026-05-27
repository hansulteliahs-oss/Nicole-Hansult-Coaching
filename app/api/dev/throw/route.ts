export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (key !== process.env.DEV_PREVIEW_KEY) {
    return new Response('Not Found', { status: 404 });
  }
  throw new Error(`Sentry test error from Phase 5 sign-off ${new Date().toISOString()}`);
}
