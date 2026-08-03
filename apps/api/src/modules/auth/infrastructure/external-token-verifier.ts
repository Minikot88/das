import { Injectable, Inject } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { ApiError } from '../../../shared/http/api-error.js';

export type VerifiedExternalClaims = { provider: string; issuer: string; externalUserId: string; organizationId: string; roles: string[]; scopes: string[]; email?: string; displayName?: string };
const arrayClaim = (value: unknown) => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 50 || !value.every(item => typeof item === 'string' && item.length > 0 && item.length <= 120)) {
    throw unauthorized();
  }
  return [...new Set(value)];
};

@Injectable()
export class ExternalTokenVerifier {
  private readonly jwks?: ReturnType<typeof createRemoteJWKSet>;
  constructor(@Inject(ENVIRONMENT) private readonly env: RuntimeEnvironment) {
    if (env.authMode === 'external' && env.authJwksUrl) {
      this.jwks = createRemoteJWKSet(new URL(env.authJwksUrl), {
        timeoutDuration: 2_000,
        cooldownDuration: 0,
      });
    }
  }
  async verify(token: string): Promise<VerifiedExternalClaims> {
    if (!this.jwks || !this.env.authIssuer || !this.env.authAudience) throw unauthorized();
    try {
      const { protectedHeader, payload } = await jwtVerify(token, this.jwks, {
        issuer: this.env.authIssuer,
        audience: this.env.authAudience,
        algorithms: this.env.authAllowedAlgorithms as ('RS256'|'RS384'|'RS512')[],
        clockTolerance: this.env.authClockSkewSeconds,
        requiredClaims: ['iss', 'aud', 'exp', 'sub', 'iat'],
      });
      const sub = typeof payload.sub === 'string' && payload.sub.trim() ? payload.sub : '';
      const org = payload[this.env.authOrganizationClaim];
      const now = Math.floor(Date.now() / 1_000);
      if (
        !protectedHeader.kid
        || !sub
        || typeof org !== 'string'
        || !org.trim()
        || typeof payload.iat !== 'number'
        || !Number.isInteger(payload.iat)
        || payload.iat > now + this.env.authClockSkewSeconds
      ) throw unauthorized();
      return { provider: this.env.authExternalProvider, issuer: this.env.authIssuer, externalUserId: sub, organizationId: org, roles: arrayClaim(payload[this.env.authRolesClaim]), scopes: arrayClaim(payload[this.env.authScopesClaim]), email: typeof payload.email === 'string' ? payload.email : undefined, displayName: typeof payload.name === 'string' ? payload.name : typeof payload.display_name === 'string' ? payload.display_name : undefined };
    } catch { throw unauthorized(); }
  }
}
function unauthorized() { return new ApiError(401, 'EXTERNAL_TOKEN_INVALID', 'A valid external session is required.'); }
