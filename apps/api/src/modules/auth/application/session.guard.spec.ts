import { describe, expect, it, vi } from 'vitest';
import { SessionGuard } from './session.guard.js';

const principal = {
  organizationId: 'org-1',
  userId: 'user-1',
  sessionId: 'external-session',
  roles: ['viewer'],
  projectScopes: [],
  authMode: 'external' as const,
};

function context(request: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => request }) } as never;
}

describe('SessionGuard verified-principal contract', () => {
  it('rejects a missing session cookie without consulting identity headers or query parameters', async () => {
    const auth = { resolveExternalIdentity: vi.fn() };
    const sessions = { authenticate: vi.fn() };
    const request = {
      method: 'GET',
      headers: { 'x-user-id': 'forged-admin', 'x-role': 'organization_admin' },
      query: { userId: 'forged-admin', role: 'organization_admin' },
    };

    await expect(new SessionGuard(
      auth as never,
      { authMode: 'external', sessionCookieName: 'dashboardmini_session' } as never,
      sessions as never,
    )
      .canActivate(context(request))).rejects.toMatchObject({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
    expect(sessions.authenticate).not.toHaveBeenCalled();
    expect(auth.resolveExternalIdentity).not.toHaveBeenCalled();
  });

  it('uses only the opaque session cookie to resolve the database principal', async () => {
    const sessions = { authenticate: vi.fn().mockResolvedValue(principal) };
    const auth = { resolveExternalIdentity: vi.fn() };
    const request = {
      headers: {
        cookie: 'dashboardmini_session=opaque_session_token_12345678901234567890',
        authorization: 'Bearer signed.jwt.value',
        'x-user-id': 'forged-admin',
        'x-role': 'organization_admin',
      },
      query: { userId: 'forged-admin' },
    };

    await expect(new SessionGuard(
      auth as never,
      { authMode: 'external', sessionCookieName: 'dashboardmini_session' } as never,
      sessions as never,
    )
      .canActivate(context(request))).resolves.toBe(true);
    expect(sessions.authenticate).toHaveBeenCalledWith('opaque_session_token_12345678901234567890');
    expect(auth.resolveExternalIdentity).not.toHaveBeenCalled();
    expect(request).toMatchObject({ principal });
  });

  it('does not translate an authenticated-but-unauthorized identity into a 401', async () => {
    const forbidden = Object.assign(new Error('forbidden'), { status: 403, code: 'EXTERNAL_IDENTITY_NOT_AUTHORIZED' });
    const sessions = { authenticate: vi.fn().mockRejectedValue(forbidden) };
    const auth = { resolveExternalIdentity: vi.fn() };
    const request = { headers: { cookie: 'dashboardmini_session=opaque_session_token_12345678901234567890' } };

    await expect(new SessionGuard(
      auth as never,
      { authMode: 'external', sessionCookieName: 'dashboardmini_session' } as never,
      sessions as never,
    )
      .canActivate(context(request))).rejects.toMatchObject({
      status: 403,
      code: 'EXTERNAL_IDENTITY_NOT_AUTHORIZED',
    });
  });

  it('uses only the configured database technical principal in disabled mode', async () => {
    const internalPrincipal = { ...principal, sessionId: 'internal-single-user', authMode: 'disabled' as const };
    const auth = {
      authenticateInternalSingleUser: vi.fn().mockResolvedValue(internalPrincipal),
      resolveExternalIdentity: vi.fn(),
    };
    const sessions = { authenticate: vi.fn() };
    const request = {
      headers: { authorization: 'Bearer ignored', 'x-user-id': 'forged-admin' },
      query: { userId: 'forged-admin' },
    };

    await expect(new SessionGuard(auth as never, {
      authMode: 'disabled',
      internalSingleUserId: 'technical-user',
    } as never, sessions as never).canActivate(context(request))).resolves.toBe(true);
    expect(auth.authenticateInternalSingleUser).toHaveBeenCalledWith('technical-user');
    expect(auth.resolveExternalIdentity).not.toHaveBeenCalled();
    expect(sessions.authenticate).not.toHaveBeenCalled();
    expect(request).toMatchObject({ principal: internalPrincipal });
  });

  it('fails closed when disabled mode has no configured technical principal', async () => {
    const auth = { authenticateInternalSingleUser: vi.fn() };
    await expect(new SessionGuard(auth as never, { authMode: 'disabled' } as never, {} as never)
      .canActivate(context({ headers: {} }))).rejects.toMatchObject({
      status: 503,
      code: 'DISABLED_AUTH_PRINCIPAL_MISSING',
    });
    expect(auth.authenticateInternalSingleUser).not.toHaveBeenCalled();
  });

  it('authenticates external mode only from the opaque application session cookie', async () => {
    const sessionPrincipal = { ...principal, sessionId: 'database-session' };
    const sessions = { authenticate: vi.fn().mockResolvedValue(sessionPrincipal) };
    const request = {
      headers: {
        cookie: 'dashboardmini_session=opaque_session_token_12345678901234567890',
        authorization: 'Bearer browser-token-must-be-ignored',
        'x-user-id': 'forged-admin',
      },
    };

    await expect(new SessionGuard(
      {} as never,
      { authMode: 'external', sessionCookieName: 'dashboardmini_session' } as never,
      sessions as never,
    ).canActivate(context(request))).resolves.toBe(true);
    expect(sessions.authenticate).toHaveBeenCalledWith('opaque_session_token_12345678901234567890');
    expect(request).toMatchObject({ principal: sessionPrincipal });
  });

  it('rejects unsafe external requests without same-origin double-submit CSRF proof', async () => {
    const sessions = { authenticate: vi.fn() };
    const request = {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        cookie: [
          'dashboardmini_session=opaque_session_token_12345678901234567890',
          'dashboardmini_csrf=csrf_token_123456789012345678901234567890',
        ].join('; '),
        'x-csrf-token': 'csrf_token_123456789012345678901234567890',
      },
    };

    await expect(new SessionGuard(
      {} as never,
      {
        authMode: 'external',
        appUrl: 'https://dash.triup-psu.space',
        sessionCookieName: 'dashboardmini_session',
      } as never,
      sessions as never,
    ).canActivate(context(request))).rejects.toMatchObject({
      status: 403,
      code: 'CSRF_ORIGIN_INVALID',
    });
    expect(sessions.authenticate).not.toHaveBeenCalled();
  });
});
