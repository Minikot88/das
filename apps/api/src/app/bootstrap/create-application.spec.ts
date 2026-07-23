import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import { describe, expect, it } from 'vitest';
import { securityHeadersOptions } from './create-application.js';

describe('securityHeadersOptions', () => {
  it('does not extend HSTS to unverified subdomains', async () => {
    const app = Fastify();
    await app.register(helmet, securityHeadersOptions);
    app.get('/health', async () => ({ ok: true }));

    const response = await app.inject('/health');

    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['strict-transport-security']).not.toContain('includeSubDomains');
    await app.close();
  });
});
