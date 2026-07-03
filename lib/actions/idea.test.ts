import { describe, it, expect, beforeEach, vi } from 'vitest';

// Server action reads x-forwarded-for via next/headers — mock it for the node env.
vi.mock('next/headers', () => ({
  headers: async () => new Map([['x-forwarded-for', '203.0.113.5']]),
}));

// Mock the service-role Supabase client so no live DB is touched.
const insertMock = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: () => ({ insert: insertMock }) }),
}));

import { bankIdeaAction } from './idea';
import { _resetCache } from '@/lib/rate-limit';
import type { IdeaInput } from '@/lib/schemas/idea';

const KEY = 'test-key-123';

function payload(over: Partial<IdeaInput> = {}): IdeaInput {
  return {
    key: KEY,
    topic: 'Why your body feels stiff after 40',
    notes: '',
    tag: 'either',
    imageUrls: [],
    _hp: '',
    ...over,
  };
}

describe('bankIdeaAction', () => {
  beforeEach(() => {
    _resetCache();
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    process.env.IDEA_BANK_KEY = KEY;
  });

  it('rejects a bad passcode without inserting', async () => {
    const res = await bankIdeaAction(payload({ key: 'wrong' }));
    expect(res).toEqual({ success: false, error: 'bad_key' });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('silently drops a honeypot hit', async () => {
    const res = await bankIdeaAction(payload({ _hp: 'i am a bot' }));
    expect(res).toEqual({ success: false, error: 'spam' });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects an empty topic', async () => {
    const res = await bankIdeaAction(payload({ topic: '   ' }));
    expect(res).toEqual({ success: false, error: 'invalid' });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('inserts a valid idea with status=available and defaults the omitted tag', async () => {
    const res = await bankIdeaAction(payload({ tag: undefined, notes: 'a quick note', topic: 'Sleep and recovery' }));
    expect(res).toEqual({ success: true });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'Sleep and recovery',
        raw_notes: 'a quick note',
        tag: 'either',
        image_urls: [],
        status: 'available',
      }),
    );
  });

  it('stores null raw_notes when notes are blank', async () => {
    await bankIdeaAction(payload({ notes: '' }));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ raw_notes: null }),
    );
  });

  it('keeps only Vercel Blob image URLs', async () => {
    await bankIdeaAction(
      payload({
        imageUrls: [
          'https://evil.example.com/x.jpg',
          'https://abc123.public.blob.vercel-storage.com/y.jpg',
        ],
      }),
    );
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        image_urls: ['https://abc123.public.blob.vercel-storage.com/y.jpg'],
      }),
    );
  });

  it('returns a server error when the insert fails', async () => {
    insertMock.mockResolvedValue({ error: { message: 'boom' } });
    const res = await bankIdeaAction(payload());
    expect(res).toEqual({ success: false, error: 'server' });
  });
});
