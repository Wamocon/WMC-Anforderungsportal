import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, getRateLimitHeaders } from '../rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    // Reset the internal map by advancing time far enough
    vi.useFakeTimers();
  });

  it('allows the first request', () => {
    const result = rateLimit('user1:127.0.0.1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(14); // 15 - 1
  });

  it('tracks remaining requests correctly', () => {
    const key = 'user2:10.0.0.1';
    for (let i = 0; i < 10; i++) {
      rateLimit(key);
    }
    const result = rateLimit(key);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // 15 - 11
  });

  it('blocks requests after limit is reached', () => {
    const key = 'user3:10.0.0.2';
    for (let i = 0; i < 15; i++) {
      rateLimit(key);
    }
    const result = rateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after the window expires', () => {
    const key = 'user4:10.0.0.3';
    for (let i = 0; i < 15; i++) {
      rateLimit(key);
    }
    expect(rateLimit(key).allowed).toBe(false);

    // Advance past the 60-second window
    vi.advanceTimersByTime(61_000);

    const result = rateLimit(key);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(14);
  });

  it('isolates different keys', () => {
    const keyA = 'userA:10.0.0.4';
    const keyB = 'userB:10.0.0.5';

    for (let i = 0; i < 15; i++) {
      rateLimit(keyA);
    }
    expect(rateLimit(keyA).allowed).toBe(false);
    expect(rateLimit(keyB).allowed).toBe(true);
  });
});

describe('getRateLimitHeaders', () => {
  it('returns correct headers', () => {
    const headers = getRateLimitHeaders(10);
    expect(headers['X-RateLimit-Limit']).toBe('15');
    expect(headers['X-RateLimit-Remaining']).toBe('10');
  });

  it('clamps remaining to 0', () => {
    const headers = getRateLimitHeaders(-1);
    expect(headers['X-RateLimit-Remaining']).toBe('0');
  });
});
