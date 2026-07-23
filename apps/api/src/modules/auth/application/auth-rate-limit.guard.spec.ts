import { describe, expect, it } from 'vitest';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';

describe('AuthRateLimitGuard', () => {
  it('limits repeated authentication attempts by IP and normalized email', () => {
    const guard = new AuthRateLimitGuard();
    const context = { switchToHttp: () => ({ getRequest: () => ({ ip: '203.0.113.1', body: { email: ' User@Example.com ' } }) }) } as never;
    for (let attempt = 0; attempt < 10; attempt += 1) expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(expect.objectContaining({ status: 429, code: 'RATE_LIMITED' }));
  });
});
