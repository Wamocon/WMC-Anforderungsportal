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

  it('returns user when token is stored in chunked cookies (.0, .1)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-456', email: 'chunked@example.com' } },
      error: null,
    });

    // Simulate a Supabase SSR session split across two cookie chunks
    const sessionJson = JSON.stringify({
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NTYifQ.fake-long-token',
      refresh_token: 'refresh-token-value',
      expires_at: 9999999999,
    });
    const mid = Math.floor(sessionJson.length / 2);
    const chunk0 = encodeURIComponent(sessionJson.slice(0, mid));
    const chunk1 = encodeURIComponent(sessionJson.slice(mid));

    const req = new Request('https://example.com/api/ai/summary', {
      method: 'POST',
      headers: {
        cookie: `sb-test-auth-token.0=${chunk0}; sb-test-auth-token.1=${chunk1}`,
      },
    });

    const result = await verifyAuth(req);
    expect(result).toEqual({ id: 'user-456', email: 'chunked@example.com' });
  });

  it('returns user when token is stored as JSON array in .0 cookie', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-789', email: 'array@example.com' } },
      error: null,
    });

    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ODkifQ.fake';
    const arrayValue = encodeURIComponent(JSON.stringify([jwt, 'refresh-token']));

    const req = new Request('https://example.com/api/ai/summary', {
      method: 'POST',
      headers: {
        cookie: `sb-test-auth-token.0=${arrayValue}`,
      },
    });

    const result = await verifyAuth(req);
    expect(result).toEqual({ id: 'user-789', email: 'array@example.com' });
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
