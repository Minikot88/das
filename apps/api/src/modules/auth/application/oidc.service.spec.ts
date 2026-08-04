import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OidcService } from './oidc.service.js';

function fixture() {
  const prisma = {
    $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
    oidcLoginTransaction: {
      create: vi.fn().mockResolvedValue({ id: 'transaction-1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const verifier = {
    verify: vi.fn().mockResolvedValue({
      provider: 'psu-sso',
      issuer: 'https://psusso.psu.ac.th/application/o/research-triupact/',
      externalUserId: 'stable-subject',
      roles: [],
      scopes: [],
    }),
  };
  const principal = {
    organizationId: 'org-1',
    userId: 'user-1',
    sessionId: 'resolved-identity',
    roles: ['member'],
    projectScopes: [],
    authMode: 'external' as const,
  };
  const auth = { resolveExternalIdentity: vi.fn().mockResolvedValue(principal) };
  const sessions = {
    create: vi.fn().mockResolvedValue({
      sessionToken: 'opaque_session_token_12345678901234567890',
      csrfToken: 'csrf_token_123456789012345678901234567890',
    }),
  };
  const environment = {
    authExternalProvider: 'psu-sso',
    oidcAuthorizationUrl: 'https://psusso.example.test/application/o/authorize/',
    oidcTokenUrl: 'https://psusso.example.test/application/o/token/',
    oidcClientId: 'dashboardmini-client',
    oidcClientSecret: 'client-secret-value-0000000000000000',
    oidcRedirectUri: 'https://dash.example.test/api/auth/callback',
    oidcScopes: ['openid', 'profile', 'email'],
    sessionSecret: 'session-secret-value-000000000000000',
  };
  return {
    service: new OidcService(
      prisma as never,
      verifier as never,
      auth as never,
      sessions as never,
      environment as never,
    ),
    prisma,
    verifier,
    auth,
    sessions,
  };
}

describe('OidcService authorization-code flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates state, nonce and PKCE and accepts only a safe internal return path', async () => {
    const { service, prisma } = fixture();

    const started = await service.begin('https://evil.example/steal');
    const authorization = new URL(started.authorizationUrl);

    expect(authorization.origin).toBe('https://psusso.example.test');
    expect(authorization.searchParams.get('response_type')).toBe('code');
    expect(authorization.searchParams.get('client_id')).toBe('dashboardmini-client');
    expect(authorization.searchParams.get('redirect_uri')).toBe('https://dash.example.test/api/auth/callback');
    expect(authorization.searchParams.get('state')).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(authorization.searchParams.get('nonce')).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorization.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(started.transactionCookie).not.toContain(authorization.searchParams.get('state'));
    expect(prisma.oidcLoginTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stateHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        returnPath: '/dashboard-v2',
        expiresAt: expect.any(Date),
      }),
    });
    expect(prisma.oidcLoginTransaction.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } },
    });
  });

  it('exchanges the code, verifies nonce, resolves database identity and creates an application session', async () => {
    const { service, verifier, auth, sessions } = fixture();
    const started = await service.begin('/datasets');
    const state = new URL(started.authorizationUrl).searchParams.get('state');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      token_type: 'Bearer',
      id_token: 'signed-id-token',
      access_token: 'server-only-access-token',
      expires_in: 300,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const completed = await service.complete({
      code: 'single-use-authorization-code',
      state,
      transactionCookie: started.transactionCookie,
    });

    expect(completed).toEqual({
      returnPath: '/datasets',
      sessionToken: 'opaque_session_token_12345678901234567890',
      csrfToken: 'csrf_token_123456789012345678901234567890',
    });
    expect(verifier.verify).toHaveBeenCalledWith('signed-id-token', expect.stringMatching(/^[A-Za-z0-9_-]{40,}$/));
    expect(auth.resolveExternalIdentity).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'psu-sso',
      externalUserId: 'stable-subject',
    }));
    expect(sessions.create).toHaveBeenCalled();
  });

  it('rejects state mismatch before exchanging a code', async () => {
    const { service } = fixture();
    const started = await service.begin('/dashboard-v2');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(service.complete({
      code: 'authorization-code',
      state: 'attacker-state',
      transactionCookie: started.transactionCookie,
    })).rejects.toMatchObject({ status: 401, code: 'OIDC_STATE_INVALID' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a missing authorization code before token exchange', async () => {
    const { service } = fixture();
    const started = await service.begin('/dashboard-v2');
    const state = new URL(started.authorizationUrl).searchParams.get('state');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(service.complete({
      code: null,
      state,
      transactionCookie: started.transactionCookie,
    })).rejects.toMatchObject({ status: 401, code: 'OIDC_STATE_INVALID' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails closed when the backend token exchange is rejected', async () => {
    const { service, verifier } = fixture();
    const started = await service.begin('/dashboard-v2');
    const state = new URL(started.authorizationUrl).searchParams.get('state');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ error: 'invalid_grant' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    ));

    await expect(service.complete({
      code: 'rejected-code',
      state,
      transactionCookie: started.transactionCookie,
    })).rejects.toMatchObject({ status: 401, code: 'OIDC_TOKEN_EXCHANGE_FAILED' });
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('rejects replayed callbacks', async () => {
    const { service, prisma } = fixture();
    const started = await service.begin('/dashboard-v2');
    const state = new URL(started.authorizationUrl).searchParams.get('state');
    prisma.oidcLoginTransaction.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id_token: 'signed-id-token',
      access_token: 'server-only',
      token_type: 'Bearer',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    await service.complete({ code: 'authorization-code', state, transactionCookie: started.transactionCookie });
    await expect(service.complete({ code: 'authorization-code', state, transactionCookie: started.transactionCookie }))
      .rejects.toMatchObject({ status: 401, code: 'OIDC_CALLBACK_REPLAYED' });
  });
});
