import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApplication } from '../src/app/bootstrap/create-application.js';

describe('HTTP foundation', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApplication({
      NODE_ENV: 'test',
      AUTH_MODE: 'external',
      AUTH_EXTERNAL_PROVIDER: 'psu-sso',
      AUTH_JWKS_URL: 'http://127.0.0.1:1/jwks',
      AUTH_ISSUER: 'https://identity.test.local',
      AUTH_AUDIENCE: 'dashboardmini-test-client',
      AUTH_ALLOWED_ALGORITHMS: 'RS256',
      OIDC_AUTHORIZATION_URL: 'https://identity.test.local/authorize',
      OIDC_TOKEN_URL: 'https://identity.test.local/token',
      OIDC_USERINFO_URL: 'https://identity.test.local/userinfo',
      OIDC_CLIENT_ID: 'dashboardmini-test-client',
      OIDC_CLIENT_SECRET: 'test-client-secret-value-000000000000',
      OIDC_REDIRECT_URI: 'http://localhost:8080/api/auth/callback',
      SESSION_SECRET: 'test-session-secret-value-000000000000',
      APP_URL: 'http://localhost:8080',
      SECRET_MASTER_KEY: randomBytes(32).toString('base64'),
      DATABASE_URL: 'postgresql://dashboard:dashboard@127.0.0.1:5432/dashboard_mini_bi',
    });
  });

  afterAll(async () => app?.close());

  it('returns canonical health with a request id', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ data: { status: 'ok' } });
    expect(response.json().requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sets security headers and only allows configured CORS origins', async () => {
    const allowed = await app.inject({ method: 'GET', url: '/api/v1/health', headers: { origin: 'http://localhost:8080' } });
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:8080');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
    expect(allowed.headers['referrer-policy']).toBeTruthy();
    expect(allowed.headers['x-powered-by']).toBeUndefined();

    const denied = await app.inject({ method: 'GET', url: '/api/v1/health', headers: { origin: 'https://attacker.example.test' } });
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects requests beyond the HTTP body limit', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: `${'x'.repeat(6 * 1024 * 1024)}@example.test`, password: 'x' },
    });
    expect(response.statusCode).toBe(413);
  });

  it('returns Gone for all built-in credential endpoints without setting cookies', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'dev@example.com', password: 'development-password' } });
    expect(response.statusCode).toBe(410);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.json()).toMatchObject({ code: 'BUILT_IN_AUTH_REMOVED' });
    expect(response.body).not.toContain('development-password');

    for (const [method, url] of [
      ['POST', '/api/v1/auth/forgot-password'],
      ['POST', '/api/v1/auth/reset-password'],
      ['POST', '/api/v1/auth/logout'],
      ['POST', '/api/auth/register'],
    ] as const) {
      const removed = await app.inject({ method, url });
      expect(removed.statusCode).toBe(410);
      expect(removed.json()).toMatchObject({ code: 'BUILT_IN_AUTH_REMOVED' });
    }
  });

  it('removes the legacy login adapter contract', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'dev@example.com', password: 'development-password' } });
    expect(response.statusCode).toBe(410);
    expect(response.json()).toMatchObject({ code: 'BUILT_IN_AUTH_REMOVED' });
  });

  it('requires an opaque application session for tenant data', async () => {
    const denied = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(denied.statusCode).toBe(401);
    expect(denied.json()).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });
  });

  it('ignores browser identity headers and query identity hints', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects?userId=forged-admin&role=organization_admin',
      headers: { 'x-user-id': 'forged-admin', 'x-role': 'organization_admin' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });
  });
});
