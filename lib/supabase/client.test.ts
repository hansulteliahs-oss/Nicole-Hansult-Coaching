import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test_key');
});

describe('lib/supabase/client', () => {
  it('createClient returns object with .auth property', async () => {
    const { createClient } = await import('./client');
    const client = createClient();
    expect(client).toHaveProperty('auth');
  });
});
