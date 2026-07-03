import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

/**
 * Blob client-upload token handler for Idea Bank photos.
 *
 * The /idea form calls `upload()` (from @vercel/blob/client), which POSTs here to
 * mint a short-lived upload token, then streams the file straight to Vercel Blob
 * — bypassing the 4.5MB serverless request-body limit (phone photos are bigger).
 * Token issuance is gated on the same IDEA_BANK_KEY passcode the form uses,
 * passed as `clientPayload`; an unauthorized caller gets no token.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!clientPayload || clientPayload !== process.env.IDEA_BANK_KEY) {
          throw new Error('unauthorized');
        }
        return {
          allowedContentTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/heic',
            'image/heif',
            'image/gif',
          ],
          maximumSizeInBytes: 15_000_000, // ~15MB — comfortably covers phone photos
          addRandomSuffix: true,
        };
      },
      // No-op: the URL returns to the client, which submits it to bankIdeaAction.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
