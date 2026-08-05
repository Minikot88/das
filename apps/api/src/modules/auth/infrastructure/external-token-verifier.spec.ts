import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { ExternalTokenVerifier } from './external-token-verifier.js';

type SigningKey = Awaited<ReturnType<typeof generateKeyPair>>;

const issuer = 'https://psusso.psu.ac.th/application/o/research-triupact/';
const audience = 'dashboardmini-test-client';
let server: Server;
let jwksUrl: string;
let primary: SigningKey;
let rotated: SigningKey;
let jwks: Array<Record<string, unknown>>;
let requestCount = 0;

beforeAll(async () => {
  primary = await generateKeyPair('RS256');
  rotated = await generateKeyPair('RS256');
  jwks = [
    { ...(await exportJWK(primary.publicKey)), kid: 'primary', alg: 'RS256', use: 'sig' },
  ];
  server = createServer((request, response) => {
    requestCount += 1;
    if (request.url === '/timeout') return;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ keys: jwks }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test JWKS server did not start');
  jwksUrl = `http://127.0.0.1:${address.port}/jwks`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
});

function environment(url = jwksUrl) {
  return {
    authMode: 'external',
    authExternalProvider: 'psu-sso',
    authJwksUrl: url,
    authIssuer: issuer,
    authAudience: audience,
    authAllowedAlgorithms: ['RS256'],
    authClockSkewSeconds: 0,
    authOrganizationClaim: 'org_id',
    authRolesClaim: 'roles',
    authScopesClaim: 'scopes',
  } as never;
}

async function token(
  key: SigningKey = primary,
  options: {
    kid?: string | null;
    issuer?: string;
    audience?: string | string[];
    subject?: string | null;
    organization?: unknown;
    roles?: unknown;
    scopes?: unknown;
    expiration?: number;
    notBefore?: number;
    issuedAt?: number;
  } = {},
) {
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = {
    org_id: options.organization === undefined ? 'org-1' : options.organization,
    roles: options.roles === undefined ? ['viewer'] : options.roles,
    scopes: options.scopes === undefined ? ['dashboard:read'] : options.scopes,
  };
  let builder = new SignJWT(claims)
    .setProtectedHeader(options.kid === null ? { alg: 'RS256' } : { alg: 'RS256', kid: options.kid || 'primary' })
    .setIssuedAt(options.issuedAt ?? now)
    .setIssuer(options.issuer || issuer)
    .setAudience(options.audience || audience)
    .setExpirationTime(options.expiration ?? now + 300);
  if (options.subject !== null) builder = builder.setSubject(options.subject || 'subject-1');
  if (options.notBefore !== undefined) builder = builder.setNotBefore(options.notBefore);
  return builder.sign(key.privateKey);
}

describe('ExternalTokenVerifier JWT/JWKS security contract', () => {
  it('verifies signature, kid, issuer, audience, lifetime, subject and organization', async () => {
    await expect(new ExternalTokenVerifier(environment()).verify(await token())).resolves.toEqual({
      provider: 'psu-sso',
      issuer,
      externalUserId: 'subject-1',
      organizationId: 'org-1',
      roles: ['viewer'],
      scopes: ['dashboard:read'],
      email: undefined,
      displayName: undefined,
    });
  });

  it('rejects expired, future-nbf, future-iat, wrong-issuer and wrong-audience tokens', async () => {
    const now = Math.floor(Date.now() / 1000);
    const verifier = new ExternalTokenVerifier(environment());
    for (const invalid of [
      await token(primary, { expiration: now - 1 }),
      await token(primary, { notBefore: now + 300 }),
      await token(primary, { issuedAt: now + 300 }),
      await token(primary, { issuer: 'https://wrong.triup-psu.space' }),
      await token(primary, { audience: 'another-service' }),
    ]) {
      await expect(verifier.verify(invalid)).rejects.toMatchObject({ status: 401, code: 'EXTERNAL_TOKEN_INVALID' });
    }
  });

  it('accepts an audience array only when it contains the configured OIDC client id', async () => {
    const verifier = new ExternalTokenVerifier(environment());
    await expect(verifier.verify(await token(primary, {
      audience: ['another-service', audience],
    }))).resolves.toMatchObject({ externalUserId: 'subject-1' });
    await expect(verifier.verify(await token(primary, {
      audience: ['another-service', 'https://untrusted.example.invalid'],
    }))).rejects.toMatchObject({ status: 401, code: 'EXTERNAL_TOKEN_INVALID' });
  });

  it('rejects invalid signatures and missing or unknown key ids', async () => {
    const verifier = new ExternalTokenVerifier(environment());
    await expect(verifier.verify(await token(rotated, { kid: 'primary' }))).rejects.toMatchObject({ status: 401 });
    await expect(verifier.verify(await token(primary, { kid: null }))).rejects.toMatchObject({ status: 401 });
    await expect(verifier.verify(await token(rotated, { kid: 'unknown' }))).rejects.toMatchObject({ status: 401 });
  });

  it('rejects alg=none and symmetric-algorithm confusion', async () => {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const none = `${encode({ alg: 'none', kid: 'primary' })}.${encode({
      iss: issuer,
      aud: audience,
      sub: 'subject-1',
      org_id: 'org-1',
      iat: now,
      exp: now + 300,
    })}.`;
    const hs = await new SignJWT({ org_id: 'org-1' })
      .setProtectedHeader({ alg: 'HS256', kid: 'primary' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject('subject-1')
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(new TextEncoder().encode('not-an-rsa-private-key'));
    const verifier = new ExternalTokenVerifier(environment());
    await expect(verifier.verify(none)).rejects.toMatchObject({ status: 401 });
    await expect(verifier.verify(hs)).rejects.toMatchObject({ status: 401 });
  });

  it('rejects missing subject, organization and invalid role/scope claim types', async () => {
    const verifier = new ExternalTokenVerifier(environment());
    for (const invalid of [
      await token(primary, { subject: null }),
      await token(primary, { organization: null }),
      await token(primary, { roles: 'organization_admin' }),
      await token(primary, { scopes: { admin: true } }),
    ]) {
      await expect(verifier.verify(invalid)).rejects.toMatchObject({ status: 401, code: 'EXTERNAL_TOKEN_INVALID' });
    }
  });

  it('caches known keys and refreshes JWKS for key rotation', async () => {
    jwks = [{ ...(await exportJWK(primary.publicKey)), kid: 'primary', alg: 'RS256', use: 'sig' }];
    requestCount = 0;
    const verifier = new ExternalTokenVerifier(environment());
    await verifier.verify(await token());
    await verifier.verify(await token());
    expect(requestCount).toBe(1);

    jwks = [
      ...jwks,
      { ...(await exportJWK(rotated.publicKey)), kid: 'rotated', alg: 'RS256', use: 'sig' },
    ];
    await expect(verifier.verify(await token(rotated, { kid: 'rotated' }))).resolves.toMatchObject({
      externalUserId: 'subject-1',
    });
    expect(requestCount).toBe(2);
  });

  it('fails closed when the JWKS endpoint times out', async () => {
    const timeoutUrl = jwksUrl.replace('/jwks', '/timeout');
    const startedAt = Date.now();
    await expect(new ExternalTokenVerifier(environment(timeoutUrl)).verify(await token()))
      .rejects.toMatchObject({ status: 401, code: 'EXTERNAL_TOKEN_INVALID' });
    expect(Date.now() - startedAt).toBeLessThan(4_000);
  });

  it('accepts PSU SSO identity claims without organization or roles and enforces the OIDC nonce', async () => {
    const now = Math.floor(Date.now() / 1000);
    const idToken = await new SignJWT({ nonce: 'nonce-expected', email: 'display-only@example.invalid' })
      .setProtectedHeader({ alg: 'RS256', kid: 'primary' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject('psu-subject-1')
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(primary.privateKey);
    const verifier = new ExternalTokenVerifier(environment());

    await expect((verifier.verify as unknown as (value: string, nonce: string) => Promise<unknown>)(
      idToken,
      'nonce-expected',
    )).resolves.toMatchObject({
      provider: 'psu-sso',
      externalUserId: 'psu-subject-1',
      email: 'display-only@example.invalid',
    });
    await expect((verifier.verify as unknown as (value: string, nonce: string) => Promise<unknown>)(
      idToken,
      'nonce-wrong',
    )).rejects.toMatchObject({ status: 401, code: 'EXTERNAL_TOKEN_INVALID' });
  });
});
