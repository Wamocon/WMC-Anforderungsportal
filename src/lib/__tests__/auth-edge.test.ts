import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing the module
const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

// Set env vars before import
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

const { verifyAuth } = await import('../auth-edge');

describe('verifyAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no cookie header is present', async () => {
    const req = new Request('https://example.com/api/ai/chat', {
      method: 'POST',
    });
    const result = await verifyAuth(req);
    expect(result).toBeNull();
  });

  it('returns null when cookie has no Supabase token', async () => {
    const req = new Request('https://example.com/api/ai/chat', {
      method: 'POST',
      headers: { cookie: 'some_other_cookie=value' },
    });
    const result = await verifyAuth(req);
    expect(result).toBeNull();
  });

  it('returns user when token is valid', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });

    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.fake';
    const req = new Request('https://example.com/api/ai/chat', {
      method: 'POST',
      headers: { cookie: `sb-test-auth-token=${jwt}` },
    });

    const result = await verifyAuth(req);
    expect(result).toEqual({ id: 'user-123', email: 'test@example.com' });
  });

  it('returns null when Supabase returns an error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.fake';
    const req = new Request('https://example.com/api/ai/chat', {
      method: 'POST',
      headers: { cookie: `sb-test-auth-token=${jwt}` },
    });

    const result = await verifyAuth(req);
    expect(result).toBeNull();
  });

  it('returns null when env vars are missing', async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Re-import to test with missing env
    // Since module is cached, test the function behavior with current mock
    // The function reads env at call time, so deleting before call should work
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.fake';
    const req = new Request('https://example.com/api/ai/chat', {
      method: 'POST',
      headers: { cookie: `sb-test-auth-token=${jwt}` },
    });

    const result = await verifyAuth(req);
    expect(result).toBeNull();

    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });
});
