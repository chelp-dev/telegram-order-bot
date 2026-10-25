import { describe, expect, it } from 'vitest';
import { RateLimiter } from '../src/core/rateLimit.js';

describe('RateLimiter', () => {
  it('allows `limit` hits per sliding window, per key', () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.hit('a', 0)).toBe(true);
    expect(limiter.hit('a', 10)).toBe(true);
    expect(limiter.hit('a', 20)).toBe(false);
    expect(limiter.hit('b', 20)).toBe(true);
    expect(limiter.hit('a', 1001)).toBe(true);
  });

  it('does not count refused hits against the user', () => {
    const limiter = new RateLimiter(1, 1000);
    limiter.hit('a', 0);
    for (let t = 1; t < 1000; t += 100) limiter.hit('a', t);
    expect(limiter.hit('a', 1000)).toBe(true);
  });

  it('forgets idle keys when pruned, so memory stays bounded', () => {
    const limiter = new RateLimiter(1, 1000);
    limiter.hit('a', 0);
    limiter.hit('b', 4500);
    limiter.prune(5000);
    expect(limiter.size).toBe(1);
  });
});
