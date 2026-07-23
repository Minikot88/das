import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';

const environment = {
  cookieSecure: true,
  sessionAbsoluteTimeoutSeconds: 3600,
} as any;

function reply() {
  return { setCookie: vi.fn(), clearCookie: vi.fn() } as any;
}

describe('AuthController', () => {
  it('sets opaque session and readable CSRF cookies with secure production flags', async () => {
    const auth = { login: vi.fn().mockResolvedValue({
      user: { id: 'user-1' }, sessionToken: 'session-secret', csrfToken: 'csrf-secret', sessionExpiresAt: new Date('2030-01-01'),
    }) } as any;
    const controller = new AuthController(auth, {} as any, {} as any, environment);
    const response = reply();
    const result = await controller.login({ email: 'A@EXAMPLE.COM', password: 'exact password' }, {
      requestId: 'request-1', ip: '203.0.113.1', headers: { 'user-agent': 'browser' }, cookies: { mini_bi_session: 'old' },
    } as any, response);

    expect(result).toEqual({ id: 'user-1' });
    expect(auth.login).toHaveBeenCalledWith('A@EXAMPLE.COM', 'exact password', expect.objectContaining({ requestId: 'request-1', existingSessionToken: 'old' }));
    expect(response.setCookie).toHaveBeenCalledWith('mini_bi_session', 'session-secret', expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' }));
    expect(response.setCookie).toHaveBeenCalledWith('mini_bi_csrf', 'csrf-secret', expect.objectContaining({ httpOnly: false, secure: true, sameSite: 'lax', path: '/' }));
  });

  it('uses the authenticated principal and clears both cookies on logout', async () => {
    const auth = { logout: vi.fn().mockResolvedValue({ success: true }) } as any;
    const controller = new AuthController(auth, {} as any, {} as any, environment);
    const response = reply();
    await expect(controller.logout({ userId: 'user-1', sessionId: 'session-1' } as any, response)).resolves.toEqual({ success: true });
    expect(auth.logout).toHaveBeenCalledWith('session-1', 'user-1');
    expect(response.clearCookie).toHaveBeenCalledTimes(2);
  });
});
