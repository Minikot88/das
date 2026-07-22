import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApplication } from '../src/app/bootstrap/create-application.js';

describe('HTTP foundation', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApplication({
      NODE_ENV: 'test',
      AUTH_PROVIDER: 'development',
      DEVELOPMENT_AUTH_EMAIL: 'dev@example.com',
      DEVELOPMENT_AUTH_PASSWORD: 'development-password',
      SESSION_SIGNING_KEY: randomBytes(32).toString('base64'),
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

  it('authenticates only the configured development credential and sets an httpOnly cookie', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'dev@example.com', password: 'development-password' } });
    expect(response.statusCode).toBe(200);
    expect(String(response.headers['set-cookie'])).toContain('HttpOnly');
    expect(response.json()).toMatchObject({ data: { id: 'user-development', email: 'dev@example.com' } });
    expect(response.body).not.toContain('development-password');

    const denied = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'dev@example.com', password: 'wrong' } });
    expect(denied.statusCode).toBe(401);
    expect(denied.json()).toMatchObject({ code: 'INVALID_CREDENTIALS', retryable: false });
  });

  it('keeps the legacy login adapter contract', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'dev@example.com', password: 'development-password' } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 'user-development', email: 'dev@example.com' });
  });

  it('protects tenant data and preserves legacy project payloads', async () => {
    const denied = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(denied.statusCode).toBe(401);

    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'dev@example.com', password: 'development-password' } });
    const auth = authHeaders(login.headers['set-cookie']);
    const created = await app.inject({ method: 'POST', url: '/api/projects', headers: auth, payload: { name: 'Operations' } });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ name: 'Operations', revision: 0 });

    const listed = await app.inject({ method: 'GET', url: '/api/projects', headers: { cookie: auth.cookie } });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([expect.objectContaining({ name: 'Operations' })]);
  });

  it('persists chart and dashboard widget contracts without demo fallback data', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'dev@example.com', password: 'development-password' } });
    const mutationHeaders = authHeaders(login.headers['set-cookie']);
    const chart = await app.inject({ method: 'POST', url: '/api/charts', headers: mutationHeaders, payload: { projectId: 'project-a', name: 'Revenue', templateId: 'bar', mapping: { x: 'month', y: 'revenue' } } });
    expect(chart.statusCode).toBe(201);
    expect(chart.json()).toMatchObject({ name: 'Revenue', revision: 0 });

    const attached = await app.inject({ method: 'POST', url: '/api/dashboards/dashboard-a/charts', headers: mutationHeaders, payload: { chartId: chart.json().id } });
    expect(attached.statusCode).toBe(201);
    expect(attached.json().layoutItem).toMatchObject({ chartId: chart.json().id });

    const dataset = await app.inject({ method: 'GET', url: '/api/dataset', headers: { cookie: mutationHeaders.cookie } });
    expect(dataset.statusCode).toBe(404);
    expect(dataset.json().code).toBe('DATASET_NOT_FOUND');
  });
});

function csrfFromCookies(cookies: string | string[] | undefined) {
  const values = Array.isArray(cookies) ? cookies : [String(cookies || '')];
  const cookie = values.find(value => value.startsWith('mini_bi_csrf='));
  return decodeURIComponent(cookie?.split(';')[0]?.slice('mini_bi_csrf='.length) || '');
}

function authHeaders(cookies: string | string[] | undefined) {
  const values = Array.isArray(cookies) ? cookies : [String(cookies || '')];
  return {
    cookie: values.map(value => value.split(';')[0]).join('; '),
    origin: 'http://localhost:8080',
    'x-csrf-token': csrfFromCookies(cookies),
  };
}
