/**
 * POST /api/approve — server proxy that resumes the waiting n8n workflow.
 *
 * Keeps the n8n resume-webhook URL server-side (no public env, no CORS). The
 * browser sends { token, kind }; we forward to N8N_RESUME_WEBHOOK_URL. The
 * publish/idempotency logic lives in n8n (atomic approval_tokens UPDATE), so a
 * double-tap can never double-publish or double-send.
 */
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const webhook = process.env.N8N_RESUME_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json({ error: 'approval is not configured yet' }, { status: 500 });
  }

  let body: { token?: string; kind?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: 'missing token' }, { status: 400 });
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: body.token, kind: body.kind ?? 'post' }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `publish failed (${res.status})` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'could not reach the publisher' }, { status: 502 });
  }
}
