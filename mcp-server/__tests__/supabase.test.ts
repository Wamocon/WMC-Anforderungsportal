/**
 * Supabase Client Configuration Tests
 *
 * Tests for environment variable validation, client creation,
 * and user-scoped client behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the module in isolation, so we'll use dynamic imports
// after setting env vars

describe('getSupabaseClient', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    // Reset env
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('falls back to default URL when SUPABASE_URL is missing', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    const mod = await import('../src/supabase.js');
    const client = mod.getServiceClient();
    expect(client).toBeDefined();
  });

  it('throws when SERVICE_ROLE_KEY is missing', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    const mod = await import('../src/supabase.js');
    expect(() => mod.getServiceClient()).toThrow('Missing SUPABASE_SERVICE_ROLE_KEY');
  });

  it('creates client with SERVICE_ROLE_KEY', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-123';
    const mod = await import('../src/supabase.js');
    const client = mod.getServiceClient();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('returns singleton instance on repeated calls', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
    const mod = await import('../src/supabase.js');
    const c1 = mod.getServiceClient();
    const c2 = mod.getServiceClient();
    expect(c1).toBe(c2);
  });

  it('getSupabaseClient returns service client when no session', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
    const mod = await import('../src/supabase.js');
    mod.setSession(null);
    const client = mod.getSupabaseClient();
    expect(client).toBeDefined();
  });
});

describe('getSupabaseClientForUser', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses default URL and anon key when env vars are missing', async () => {
    const mod = await import('../src/supabase.js');
    const client = mod.getSupabaseClientForUser('some-token');
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('creates user-scoped client with access token', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    const mod = await import('../src/supabase.js');
    const client = mod.getSupabaseClientForUser('user-jwt-token');
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('creates new client per call (not cached)', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    const mod = await import('../src/supabase.js');
    const c1 = mod.getSupabaseClientForUser('token-1');
    const c2 = mod.getSupabaseClientForUser('token-2');
    // Each call should create a separate client (different tokens)
    expect(c1).not.toBe(c2);
  });
});

describe('Session management', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('getSession returns null by default', async () => {
    const mod = await import('../src/supabase.js');
    expect(mod.getSession()).toBeNull();
  });

  it('setSession sets and getSession returns it', async () => {
    const mod = await import('../src/supabase.js');
    const session = {
      accessToken: 'jwt',
      refreshToken: 'rt',
      email: 'test@wmc.de',
      userId: 'u1',
      role: 'staff',
      expiresAt: 9999999999,
    };
    mod.setSession(session);
    expect(mod.getSession()).toEqual(session);
  });

  it('signOut clears the session', async () => {
    const mod = await import('../src/supabase.js');
    mod.setSession({ accessToken: 'j', refreshToken: 'r', email: 'e', userId: 'u', role: 'r', expiresAt: 0 });
    mod.signOut();
    expect(mod.getSession()).toBeNull();
  });
});
