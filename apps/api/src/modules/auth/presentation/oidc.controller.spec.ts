import { describe, expect, it, vi } from 'vitest';
import { OidcController } from './oidc.controller.js';

function replyFixture() {
  const headers = new Map<string, unknown>();
  const reply = {
    header: vi.fn((name: string, value: unknown) => {
      headers.set(name.toLowerCase(), value);
      return reply;
    }),
    status: vi.fn(() => reply),
    send: vi.fn(() => reply),
  };
  return { reply, headers };
}

function fixture() {
  const oidc = {
    begin: vi.fn().mockResolvedValue({
      authorizationUrl: 'https://psusso.psu.ac.th/application/o/authorize/?state=safe',
      transactionCookie: 'encrypted_transaction_cookie_12345678901234567890',
    }),
    complete: vi.fn().mockResolvedValue({
      returnPath: '/dashboard-v2',
      sessionToken: 'opaque_session_token_12345678901234567890',
      csrfToken: 'csrf_token_123456789012345678901234567890',
    }),
  };
  const sessions = { logout: vi.fn().mockResolvedValue(undefined) };
  const environment = {
    nodeEnv: 'production',
    appUrl: 'https://dash.triup-psu.space',
    sessionCookieName: 'dashboardmini_session',
    sessionCookieMaxAgeSeconds: 3_600,
  };
  return {
    controller: new OidcController(oidc as never, sessions as never, environment as never),
    oidc,
    sessions,
  };
}

describe('OidcController', () => {
  it('redirects login to PSU SSO with a short-lived secure transaction cookie', async () => {
    const { controller } = fixture();
    const { reply, headers } = replyFixture();

    await controller.login('/datasets', reply as never);

    expect(reply.status).toHaveBeenCalledWith(302);
    expect(headers.get('location')).toMatch(/^https:\/\/psusso\.psu\.ac\.th\//);
    expect(String(headers.get('set-cookie'))).toMatch(
      /dashboardmini_oidc=.*HttpOnly; Secure; SameSite=Lax; Path=\/api\/auth; Max-Age=300/,
    );
  });

  it('sets only opaque application-session and CSRF cookies after callback', async () => {
    const { controller, oidc } = fixture();
    const { reply, headers } = replyFixture();

    await controller.callback(
      'authorization-code',
      'state-value',
      undefined,
      { headers: { cookie: 'dashboardmini_oidc=encrypted_transaction_cookie_12345678901234567890' } } as never,
      reply as never,
    );

    expect(oidc.complete).toHaveBeenCalledWith({
      code: 'authorization-code',
      state: 'state-value',
      transactionCookie: 'encrypted_transaction_cookie_12345678901234567890',
    });
    const cookies = headers.get('set-cookie') as string[];
    expect(cookies).toEqual(expect.arrayContaining([
      expect.stringMatching(/dashboardmini_session=.*HttpOnly; Secure; SameSite=Lax; Path=\/; Max-Age=3600/),
      expect.stringMatching(/dashboardmini_csrf=.*Secure; SameSite=Strict; Path=\/; Max-Age=3600/),
      expect.stringMatching(/dashboardmini_oidc=;.*Max-Age=0/),
    ]));
    expect(JSON.stringify(cookies)).not.toContain('authorization-code');
    expect(reply.status).toHaveBeenCalledWith(303);
    expect(headers.get('location')).toBe('/dashboard-v2');
  });

  it('requires same-origin plus matching CSRF before logout and clears cookies', async () => {
    const { controller, sessions } = fixture();
    const { reply, headers } = replyFixture();

    await controller.logout(
      {
        headers: {
          origin: 'https://dash.triup-psu.space',
          cookie: [
            'dashboardmini_session=opaque_session_token_12345678901234567890',
            'dashboardmini_csrf=csrf_token_123456789012345678901234567890',
          ].join('; '),
          'x-csrf-token': 'csrf_token_123456789012345678901234567890',
        },
      } as never,
      reply as never,
    );

    expect(sessions.logout).toHaveBeenCalledWith(
      'opaque_session_token_12345678901234567890',
      'csrf_token_123456789012345678901234567890',
    );
    expect(headers.get('set-cookie')).toEqual(expect.arrayContaining([
      expect.stringMatching(/dashboardmini_session=;.*Max-Age=0/),
      expect.stringMatching(/dashboardmini_csrf=;.*Max-Age=0/),
    ]));
    expect(reply.status).toHaveBeenCalledWith(204);
  });

  it('rejects cross-origin logout before touching the session', async () => {
    const { controller, sessions } = fixture();
    const { reply } = replyFixture();

    await expect(controller.logout(
      { headers: { origin: 'https://evil.example', cookie: '' } } as never,
      reply as never,
    )).rejects.toMatchObject({ status: 403, code: 'CSRF_ORIGIN_INVALID' });
    expect(sessions.logout).not.toHaveBeenCalled();
  });
});
