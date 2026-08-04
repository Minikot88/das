import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../../shared/http/api-error.js';
import { ExternalTokenVerifier } from '../infrastructure/external-token-verifier.js';
import { ApplicationSessionService } from './application-session.service.js';
import { AuthService } from './auth.service.js';

@Injectable()
export class OidcService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ExternalTokenVerifier) private readonly verifier: ExternalTokenVerifier,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ApplicationSessionService) private readonly sessions: ApplicationSessionService,
    @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment,
  ) {}

  async begin(_returnPath?: string): Promise<{ authorizationUrl: string; transactionCookie: string }> {
    const environment = requiredEnvironment(this.environment);
    const state = randomValue();
    const nonce = randomValue();
    const verifier = randomValue();
    const returnPath = safeReturnPath(_returnPath);
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    const transactionId = `oidc_${randomBytes(18).toString('base64url')}`;
    await this.prisma.$transaction([
      this.prisma.oidcLoginTransaction.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
      this.prisma.oidcLoginTransaction.create({
        data: {
          id: transactionId,
          stateHash: hash(state),
          returnPath,
          expiresAt,
        },
      }),
    ]);
    const authorization = new URL(environment.authorizationUrl);
    authorization.searchParams.set('response_type', 'code');
    authorization.searchParams.set('client_id', environment.clientId);
    authorization.searchParams.set('redirect_uri', environment.redirectUri);
    authorization.searchParams.set('scope', environment.scopes.join(' '));
    authorization.searchParams.set('state', state);
    authorization.searchParams.set('nonce', nonce);
    authorization.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('base64url'));
    authorization.searchParams.set('code_challenge_method', 'S256');
    return {
      authorizationUrl: authorization.href,
      transactionCookie: encrypt({
        id: transactionId,
        state,
        nonce,
        verifier,
        returnPath,
        expiresAt: expiresAt.toISOString(),
      }, environment.sessionSecret),
    };
  }

  async complete(_input: {
    code: string | null;
    state: string | null;
    transactionCookie: string;
  }): Promise<{ returnPath: string; sessionToken: string; csrfToken: string }> {
    const environment = requiredEnvironment(this.environment);
    const transaction = decrypt(_input.transactionCookie, environment.sessionSecret);
    if (
      !_input.code
      || _input.code.length > 4_096
      || !_input.state
      || !safeEqual(_input.state, transaction.state)
      || new Date(transaction.expiresAt).getTime() <= Date.now()
    ) {
      throw oidcError(401, 'OIDC_STATE_INVALID', 'The sign-in request is invalid or expired.');
    }
    const consumed = await this.prisma.oidcLoginTransaction.updateMany({
      where: {
        id: transaction.id,
        stateHash: hash(_input.state),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw oidcError(401, 'OIDC_CALLBACK_REPLAYED', 'The sign-in callback was already used or expired.');
    }
    const response = await exchangeCode(environment, _input.code, transaction.verifier);
    const claims = await this.verifier.verify(response.id_token, transaction.nonce);
    const principal = await this.auth.resolveExternalIdentity(claims);
    const session = await this.sessions.create(principal);
    return { returnPath: transaction.returnPath, ...session };
  }
}

type TransactionPayload = {
  id: string;
  state: string;
  nonce: string;
  verifier: string;
  returnPath: string;
  expiresAt: string;
};

function requiredEnvironment(environment: RuntimeEnvironment) {
  if (
    !environment.oidcAuthorizationUrl
    || !environment.oidcTokenUrl
    || !environment.oidcClientId
    || !environment.oidcClientSecret
    || !environment.oidcRedirectUri
    || !environment.sessionSecret
  ) {
    throw oidcError(503, 'OIDC_NOT_CONFIGURED', 'PSU SSO is not configured.');
  }
  return {
    authorizationUrl: environment.oidcAuthorizationUrl,
    tokenUrl: environment.oidcTokenUrl,
    clientId: environment.oidcClientId,
    clientSecret: environment.oidcClientSecret,
    redirectUri: environment.oidcRedirectUri,
    scopes: environment.oidcScopes,
    sessionSecret: environment.sessionSecret,
  };
}

async function exchangeCode(
  environment: ReturnType<typeof requiredEnvironment>,
  code: string,
  verifier: string,
) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: environment.clientId,
    client_secret: environment.clientSecret,
    redirect_uri: environment.redirectUri,
    code,
    code_verifier: verifier,
  });
  let response: Response;
  try {
    response = await fetch(environment.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body,
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw oidcError(401, 'OIDC_TOKEN_EXCHANGE_FAILED', 'PSU SSO could not complete sign-in.');
  }
  if (!response.ok) throw oidcError(401, 'OIDC_TOKEN_EXCHANGE_FAILED', 'PSU SSO could not complete sign-in.');
  let payload: unknown;
  try { payload = await response.json(); } catch {
    throw oidcError(401, 'OIDC_TOKEN_EXCHANGE_FAILED', 'PSU SSO returned an invalid response.');
  }
  const idToken = (payload as { id_token?: unknown }).id_token;
  if (typeof idToken !== 'string' || !idToken || idToken.length > 24_000) {
    throw oidcError(401, 'OIDC_TOKEN_EXCHANGE_FAILED', 'PSU SSO returned an invalid response.');
  }
  return { id_token: idToken };
}

function safeReturnPath(value?: string) {
  if (!value || value.length > 500 || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/dashboard-v2';
  }
  let url: URL;
  try { url = new URL(value, 'https://dashboard.internal'); } catch { return '/dashboard-v2'; }
  if (url.origin !== 'https://dashboard.internal' || url.search || url.hash) return '/dashboard-v2';
  const allowed = ['/dashboard-v2', '/datasets', '/connections'];
  return allowed.some(prefix => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))
    ? url.pathname
    : '/dashboard-v2';
}

function randomValue() {
  return randomBytes(32).toString('base64url');
}

function hash(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function encryptionKey(secret: string) {
  return createHash('sha256').update(secret, 'utf8').digest();
}

function encrypt(value: TransactionPayload, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

function decrypt(value: string, secret: string): TransactionPayload {
  try {
    if (!/^[A-Za-z0-9_-]{40,4096}$/.test(value)) throw new Error('invalid');
    const decoded = Buffer.from(value, 'base64url');
    if (decoded.length < 29) throw new Error('invalid');
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), decoded.subarray(0, 12));
    decipher.setAuthTag(decoded.subarray(12, 28));
    const payload = JSON.parse(Buffer.concat([
      decipher.update(decoded.subarray(28)),
      decipher.final(),
    ]).toString('utf8')) as TransactionPayload;
    if (
      !payload
      || typeof payload.id !== 'string'
      || typeof payload.state !== 'string'
      || typeof payload.nonce !== 'string'
      || typeof payload.verifier !== 'string'
      || typeof payload.returnPath !== 'string'
      || typeof payload.expiresAt !== 'string'
    ) throw new Error('invalid');
    return payload;
  } catch {
    throw oidcError(401, 'OIDC_STATE_INVALID', 'The sign-in request is invalid or expired.');
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function oidcError(status: number, code: string, message: string) {
  return new ApiError(status, code, message);
}
