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
  it('rejects a missing bearer token without consulting identity headers or query parameters', async () => {
    const auth = { resolveExternalIdentity: vi.fn() };
    const verifier = { verify: vi.fn() };
    const request = {
      method: 'GET',
      headers: { 'x-user-id': 'forged-admin', 'x-role': 'organization_admin' },
      query: { userId: 'forged-admin', role: 'organization_admin' },
    };

    await expect(new SessionGuard(auth as never, { authMode: 'external' } as never, verifier as never)
      .canActivate(context(request))).rejects.toMatchObject({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
    expect(verifier.verify).not.toHaveBeenCalled();
    expect(auth.resolveExternalIdentity).not.toHaveBeenCalled();
  });

  it('uses only verifier output to resolve the database principal', async () => {
    const claims = {
      provider: 'main-website',
      issuer: 'https://identity.example.test',
      externalUserId: 'subject-1',
      organizationId: 'org-1',
      roles: [],
      scopes: [],
    };
    const verifier = { verify: vi.fn().mockResolvedValue(claims) };
    const auth = { resolveExternalIdentity: vi.fn().mockResolvedValue(principal) };
    const request = {
      headers: {
        authorization: 'Bearer signed.jwt.value',
        'x-user-id': 'forged-admin',
        'x-role': 'organization_admin',
      },
      query: { userId: 'forged-admin' },
    };

    await expect(new SessionGuard(auth as never, { authMode: 'external' } as never, verifier as never)
      .canActivate(context(request))).resolves.toBe(true);
    expect(verifier.verify).toHaveBeenCalledWith('signed.jwt.value');
    expect(auth.resolveExternalIdentity).toHaveBeenCalledWith(claims);
    expect(request).toMatchObject({ principal });
  });

  it('does not translate an authenticated-but-unauthorized identity into a 401', async () => {
    const verifier = { verify: vi.fn().mockResolvedValue({ externalUserId: 'unknown' }) };
    const forbidden = Object.assign(new Error('forbidden'), { status: 403, code: 'EXTERNAL_IDENTITY_NOT_AUTHORIZED' });
    const auth = { resolveExternalIdentity: vi.fn().mockRejectedValue(forbidden) };
    const request = { headers: { authorization: 'Bearer signed.jwt.value' } };

    await expect(new SessionGuard(auth as never, { authMode: 'external' } as never, verifier as never)
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
    const verifier = { verify: vi.fn() };
    const request = {
      headers: { authorization: 'Bearer ignored', 'x-user-id': 'forged-admin' },
      query: { userId: 'forged-admin' },
    };

    await expect(new SessionGuard(auth as never, {
      authMode: 'disabled',
      internalSingleUserId: 'technical-user',
    } as never, verifier as never).canActivate(context(request))).resolves.toBe(true);
    expect(auth.authenticateInternalSingleUser).toHaveBeenCalledWith('technical-user');
    expect(auth.resolveExternalIdentity).not.toHaveBeenCalled();
    expect(verifier.verify).not.toHaveBeenCalled();
    expect(request).toMatchObject({ principal: internalPrincipal });
  });

  it('fails closed when disabled mode has no configured technical principal', async () => {
    const auth = { authenticateInternalSingleUser: vi.fn() };
    await expect(new SessionGuard(auth as never, { authMode: 'disabled' } as never)
      .canActivate(context({ headers: {} }))).rejects.toMatchObject({
      status: 503,
      code: 'DISABLED_AUTH_PRINCIPAL_MISSING',
    });
    expect(auth.authenticateInternalSingleUser).not.toHaveBeenCalled();
  });
});
