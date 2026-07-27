import { describe, expect, it, vi } from 'vitest';
import { hashOpaqueToken } from '../domain/auth-security.js';
import { SessionGuard } from './session.guard.js';

const csrfToken = 'csrf-token-value';
const principal = {
  organizationId: 'org-1', userId: 'user-1', sessionId: 'session-1', roles: ['viewer'],
  csrfTokenHash: hashOpaqueToken(csrfToken),
};
const environment = { corsOrigins: ['https://dashboard.example.test'] } as never;

function context(request: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => request }) } as never;
}

describe('SessionGuard cookie and CSRF protection', () => {
  it('rejects a missing session cookie without calling the session repository', async () => {
    const auth = { authenticateSession: vi.fn() };
    const request = { method: 'GET', cookies: {}, headers: {} };

    await expect(new SessionGuard(auth as never, environment).canActivate(context(request))).rejects.toMatchObject({ status: 401, code: 'AUTHENTICATION_REQUIRED' });
    expect(auth.authenticateSession).not.toHaveBeenCalled();
  });

  it('uses the explicitly configured internal principal without a cookie or CSRF token', async () => {
    const internalPrincipal = { ...principal, sessionId: 'internal-single-user' };
    const auth = { authenticateSession: vi.fn(), authenticateInternalSingleUser: vi.fn().mockResolvedValue(internalPrincipal) };
    const request = { method: 'POST', cookies: {}, headers: {} };
    const singleUserEnvironment = { corsOrigins: [], internalSingleUserId: 'user-1' } as never;

    await expect(new SessionGuard(auth as never, singleUserEnvironment).canActivate(context(request))).resolves.toBe(true);
    expect(auth.authenticateInternalSingleUser).toHaveBeenCalledWith('user-1');
    expect(auth.authenticateSession).not.toHaveBeenCalled();
    expect(request).toMatchObject({ principal: internalPrincipal });
  });

  it('authenticates safe requests through the database session service', async () => {
    const auth = { authenticateSession: vi.fn().mockResolvedValue(principal) };
    const request = { method: 'GET', cookies: { mini_bi_session: 'opaque-session' }, headers: {} };

    await expect(new SessionGuard(auth as never, environment).canActivate(context(request))).resolves.toBe(true);
    expect(auth.authenticateSession).toHaveBeenCalledWith('opaque-session');
    expect(request).toMatchObject({ principal });
  });

  it('rejects state-changing requests without a matching CSRF header and cookie', async () => {
    const auth = { authenticateSession: vi.fn().mockResolvedValue(principal) };
    const request = {
      method: 'POST', cookies: { mini_bi_session: 'opaque-session', mini_bi_csrf: csrfToken },
      headers: { origin: 'https://dashboard.example.test' },
    };

    await expect(new SessionGuard(auth as never, environment).canActivate(context(request))).rejects.toMatchObject({ status: 403, code: 'CSRF_REJECTED' });
  });

  it('accepts same-origin mutations with matching CSRF proof', async () => {
    const auth = { authenticateSession: vi.fn().mockResolvedValue(principal) };
    const request = {
      method: 'PATCH', cookies: { mini_bi_session: 'opaque-session', mini_bi_csrf: csrfToken },
      headers: { origin: 'https://dashboard.example.test', 'x-csrf-token': csrfToken },
    };

    await expect(new SessionGuard(auth as never, environment).canActivate(context(request))).resolves.toBe(true);
  });

  it('rejects a valid token sent from an untrusted origin', async () => {
    const auth = { authenticateSession: vi.fn().mockResolvedValue(principal) };
    const request = {
      method: 'DELETE', cookies: { mini_bi_session: 'opaque-session', mini_bi_csrf: csrfToken },
      headers: { origin: 'https://evil.example.test', 'x-csrf-token': csrfToken },
    };

    await expect(new SessionGuard(auth as never, environment).canActivate(context(request))).rejects.toMatchObject({ status: 403, code: 'CSRF_REJECTED' });
  });
});
