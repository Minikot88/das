import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerMetrics } from './metrics.js';

describe('Prometheus metrics', () => {
  it('keeps metrics private and exports low-cardinality request telemetry', async () => {
    const app = Fastify();
    registerMetrics(app, { metricsEnabled: true, metricsToken: 'metrics-secret-value-at-least-32-bytes' } as never);
    app.get('/test', async () => ({ ok: true }));
    await app.ready();
    await app.inject({ method: 'GET', url: '/test' });
    expect((await app.inject({ method: 'GET', url: '/internal/metrics' })).statusCode).toBe(404);
    const response = await app.inject({ method: 'GET', url: '/internal/metrics', headers: { authorization: 'Bearer metrics-secret-value-at-least-32-bytes' } });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toContain('dashboard_http_requests_total');
    expect(response.body).not.toContain('/test?');
    await app.close();
  });
});
