import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';
import type { RuntimeEnvironment } from '../../app/config/environment.js';

export function registerMetrics(app: FastifyInstance, environment: RuntimeEnvironment) {
  if (!environment.metricsEnabled) return;
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: 'dashboard_' });
  const requests = new Counter({ name: 'dashboard_http_requests_total', help: 'Completed HTTP requests', labelNames: ['method', 'route', 'status'], registers: [registry] });
  const duration = new Histogram({ name: 'dashboard_http_request_duration_seconds', help: 'HTTP request duration', labelNames: ['method', 'route', 'status'], buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5], registers: [registry] });
  const active = new Gauge({ name: 'dashboard_http_active_requests', help: 'Active HTTP requests', registers: [registry] });

  app.addHook('onRequest', async request => {
    if (request.url !== '/internal/metrics') active.inc();
  });
  app.addHook('onResponse', async (request, reply) => {
    if (request.url === '/internal/metrics') return;
    active.dec();
    const labels = { method: request.method, route: request.routeOptions.url || 'unmatched', status: String(reply.statusCode) };
    requests.inc(labels);
    duration.observe(labels, reply.elapsedTime / 1_000);
  });
  app.get('/internal/metrics', async (request, reply) => {
    if (!matchesBearer(request.headers.authorization, environment.metricsToken)) return reply.code(404).send({ message: 'Not found' });
    return reply.type(registry.contentType).send(await registry.metrics());
  });
}

function matchesBearer(header: string | undefined, expected: string | undefined) {
  if (!header?.startsWith('Bearer ') || !expected) return false;
  const actual = Buffer.from(header.slice(7));
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}
