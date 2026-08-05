import { describe, expect, it } from 'vitest';
import { parseEnvironment } from './environment.js';

describe('parseEnvironment', () => {
  const productionBase = {
    NODE_ENV: 'production', AUTH_MODE: 'external', AUTH_EXTERNAL_PROVIDER: 'psu-sso',
    AUTH_JWKS_URL: 'https://psusso.psu.ac.th/application/o/research-triupact/jwks/',
    AUTH_ISSUER: 'https://psusso.psu.ac.th/application/o/research-triupact/', AUTH_AUDIENCE: 'dashboardmini-production-client',
    AUTH_ALLOWED_ALGORITHMS: 'RS256',
    OIDC_AUTHORIZATION_URL: 'https://psusso.psu.ac.th/application/o/authorize/',
    OIDC_TOKEN_URL: 'https://psusso.psu.ac.th/application/o/token/',
    OIDC_USERINFO_URL: 'https://psusso.psu.ac.th/application/o/userinfo/',
    OIDC_CLIENT_ID: 'dashboardmini-production-client',
    OIDC_CLIENT_SECRET: 'production-client-secret-value-00000000',
    OIDC_REDIRECT_URI: 'https://dash.triup-psu.space/api/auth/callback',
    OIDC_SCOPES: 'openid profile email',
    SESSION_SECRET: 'production-session-secret-value-32-bytes',
    DATABASE_URL: 'postgresql://app:secret@postgres/app',
    APP_DOMAIN: 'dash.triup-psu.space', APP_URL: 'https://dash.triup-psu.space',
    CORS_ALLOWED_ORIGINS: 'https://dash.triup-psu.space',
    SECRET_ENCRYPTION_KEY: Buffer.alloc(32, 99).toString('base64'),
  };

  it('rejects disabled authentication in production', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'production', AUTH_MODE: 'disabled' })).toThrow(
      'AUTH_MODE=disabled is forbidden in production',
    );
  });

  it('requires a 32-byte secret master key', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'test', AUTH_MODE: 'disabled', SECRET_MASTER_KEY: 'short' })).toThrow(
      'SECRET_MASTER_KEY',
    );
  });

  it('requires database and cryptographic keys in production', () => {
    expect(() => parseEnvironment({
      ...productionBase,
      DATABASE_URL: undefined,
      SECRET_ENCRYPTION_KEY: undefined,
    })).toThrow('DATABASE_URL');
  });

  it('rejects example cryptographic keys and permissive runtime flags in production', () => {
    const base = {
      ...productionBase,
      SECRET_ENCRYPTION_KEY: undefined,
      CORS_ORIGINS: 'https://dash.triup-psu.space', FILE_STORAGE_PATH: '/data/uploads',
      SECRET_MASTER_KEY: Buffer.alloc(32, 97).toString('base64'),
    };
    expect(() => parseEnvironment(base)).toThrow(/development SECRET_MASTER_KEY/i);
    expect(() => parseEnvironment({ ...base, SECRET_MASTER_KEY: `${base.SECRET_MASTER_KEY}\n` }))
      .toThrow(/development SECRET_MASTER_KEY/i);
    expect(() => parseEnvironment({ ...base, SECRET_MASTER_KEY: Buffer.alloc(32, 99).toString('base64'), DEBUG: 'true' }))
      .toThrow(/DEBUG/i);
    expect(() => parseEnvironment({ ...base, SECRET_MASTER_KEY: Buffer.alloc(32, 99).toString('base64'), DEMO_CONNECTOR_ENABLED: 'true' }))
      .toThrow(/demo connector/i);
  });

  it('forbids every supported demo-seed flag in production', () => {
    for (const key of ['INCLUDE_DEMO_SEED', 'ENABLE_DEMO_SEED']) {
      expect(() => parseEnvironment({ ...productionBase, [key]: 'true' })).toThrow(/demo seed/i);
    }
  });

  it('validates origins and operational limits', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'test', DATABASE_URL: 'mysql://app:secret@database/app' })).toThrow(/PostgreSQL/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', CORS_ORIGINS: '*' })).toThrow(/CORS/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', MAX_UPLOAD_SIZE: '999999999' })).toThrow(/MAX_UPLOAD_SIZE/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', QUERY_ROW_LIMIT: '0' })).toThrow(/QUERY_ROW_LIMIT/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', LOG_LEVEL: 'trace-all' })).toThrow(/LOG_LEVEL/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', DATABASE_POOL_MAX: '1000' })).toThrow(/DATABASE_POOL_MAX/i);
  });

  it('requires a complete asymmetric external authentication contract', () => {
    const base = { ...productionBase };
    for (const name of [
      'AUTH_EXTERNAL_PROVIDER',
      'AUTH_JWKS_URL',
      'AUTH_ISSUER',
      'AUTH_AUDIENCE',
      'AUTH_ALLOWED_ALGORITHMS',
      'OIDC_AUTHORIZATION_URL',
      'OIDC_TOKEN_URL',
      'OIDC_CLIENT_ID',
      'OIDC_CLIENT_SECRET',
      'OIDC_REDIRECT_URI',
      'SESSION_SECRET',
    ] as const) {
      expect(() => parseEnvironment({ ...base, [name]: undefined })).toThrow(/External authentication requires/);
    }
    expect(() => parseEnvironment({ ...base, AUTH_ALLOWED_ALGORITHMS: 'HS256' })).toThrow(/asymmetric RS algorithms/i);
    expect(() => parseEnvironment({ ...base, AUTH_JWKS_URL: 'http://identity.triup-psu.space/jwks' })).toThrow(/HTTPS/i);
    expect(() => parseEnvironment({ ...base, AUTH_ISSUER: 'https://placeholder.example' })).toThrow(/placeholder/i);
  });

  it('requires an HTTPS application identity', () => {
    expect(() => parseEnvironment({ ...productionBase, APP_DOMAIN: undefined })).toThrow(/APP_DOMAIN/i);
    expect(() => parseEnvironment({ ...productionBase, APP_URL: 'http://dash.triup-psu.space' })).toThrow(/APP_URL.*HTTPS/i);
    expect(() => parseEnvironment({ ...productionBase, AUTH_AUDIENCE: 'dashboardmini' })).toThrow(/AUTH_AUDIENCE.*OIDC_CLIENT_ID/i);
    expect(() => parseEnvironment({ ...productionBase, CORS_ALLOWED_ORIGINS: 'https://dash.triup-psu.space,https://other.example.test' })).toThrow(/CORS_ALLOWED_ORIGINS.*APP_URL/i);
    expect(() => parseEnvironment({ ...productionBase, AUTH_ISSUER: 'https://dash.triup-psu.space/issuer' })).toThrow(/external identity provider/i);
    expect(() => parseEnvironment({ ...productionBase, AUTH_JWKS_URL: 'https://dash.triup-psu.space/jwks' })).toThrow(/external identity provider/i);
  });

  it('enforces secure application-session cookie policy in production', () => {
    expect(() => parseEnvironment({ ...productionBase, SESSION_COOKIE_SECURE: 'false' })).toThrow(/SESSION_COOKIE_SECURE/i);
    expect(() => parseEnvironment({ ...productionBase, SESSION_COOKIE_HTTP_ONLY: 'false' })).toThrow(/SESSION_COOKIE_HTTP_ONLY/i);
    expect(() => parseEnvironment({ ...productionBase, SESSION_COOKIE_SAME_SITE: 'none' })).toThrow(/SESSION_COOKIE_SAME_SITE/i);
    expect(parseEnvironment(productionBase)).toMatchObject({
      sessionCookieSecure: true,
      sessionCookieHttpOnly: true,
      sessionCookieSameSite: 'lax',
    });
  });

  it('requires complete SMTP configuration when SMTP delivery is enabled', () => {
    expect(() => parseEnvironment({ ...productionBase, SMTP_ENABLED: 'true' })).toThrow(/SMTP_HOST/i);
    const configured = parseEnvironment({
      ...productionBase, SMTP_ENABLED: 'true', SMTP_HOST: 'mail.example.test', SMTP_PORT: '587',
      SMTP_USER: 'mailer', SMTP_PASSWORD: 'mail-secret-value', SMTP_FROM: 'Dashboard BI <noreply@example.test>',
      SMTP_SECURE: 'false',
    });
    expect(configured.smtp).toMatchObject({ enabled: true, host: 'mail.example.test', port: 587, secure: false });
  });

  it('requires a non-placeholder metrics token when production metrics are enabled', () => {
    expect(() => parseEnvironment({ ...productionBase, METRICS_ENABLED: 'true' })).toThrow(/METRICS_TOKEN/i);
  });

  it('uses the PSU SSO client id as the OIDC audience without requiring organization or role claims', () => {
    const environment = parseEnvironment({
      ...productionBase,
      AUTH_EXTERNAL_PROVIDER: 'psu-sso',
      AUTH_ISSUER: 'https://psusso.psu.ac.th/application/o/research-triupact/',
      AUTH_JWKS_URL: 'https://psusso.psu.ac.th/application/o/research-triupact/jwks/',
      AUTH_AUDIENCE: 'dashboardmini-production-client',
      AUTH_ORGANIZATION_CLAIM: undefined,
      AUTH_ROLES_CLAIM: undefined,
      AUTH_SCOPES_CLAIM: undefined,
      OIDC_AUTHORIZATION_URL: 'https://psusso.psu.ac.th/application/o/authorize/',
      OIDC_TOKEN_URL: 'https://psusso.psu.ac.th/application/o/token/',
      OIDC_USERINFO_URL: 'https://psusso.psu.ac.th/application/o/userinfo/',
      OIDC_CLIENT_ID: 'dashboardmini-production-client',
      OIDC_CLIENT_SECRET: 'production-client-secret-value-00000000',
      OIDC_REDIRECT_URI: 'https://dash.triup-psu.space/api/auth/callback',
      OIDC_SCOPES: 'openid profile email',
      SESSION_SECRET: 'production-session-secret-value-32-bytes',
    });

    expect(environment).toMatchObject({
      authExternalProvider: 'psu-sso',
      authAudience: 'dashboardmini-production-client',
      oidcClientId: 'dashboardmini-production-client',
      oidcRedirectUri: 'https://dash.triup-psu.space/api/auth/callback',
    });
  });
});
