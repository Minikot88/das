import { timingSafeEqual } from 'node:crypto';
import {
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { ApiError } from '../../../shared/http/api-error.js';
import { ApplicationSessionService } from '../application/application-session.service.js';
import { OidcService } from '../application/oidc.service.js';

const TRANSACTION_COOKIE = 'dashboardmini_oidc';
const CSRF_COOKIE = 'dashboardmini_csrf';

@Controller('api/auth')
export class OidcController {
  constructor(
    @Inject(OidcService) private readonly oidc: OidcService,
    @Inject(ApplicationSessionService) private readonly sessions: ApplicationSessionService,
    @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment,
  ) {}

  @Get('login')
  async login(
    @Query('returnTo') returnPath: string | undefined,
    @Res() reply: FastifyReply,
  ) {
    const started = await this.oidc.begin(returnPath);
    reply
      .header('cache-control', 'no-store')
      .header('referrer-policy', 'no-referrer')
      .header('set-cookie', cookie(TRANSACTION_COOKIE, started.transactionCookie, {
        maxAge: 300,
        path: '/api/auth',
        httpOnly: true,
        sameSite: 'Lax',
        secure: this.secureCookies,
      }))
      .header('location', started.authorizationUrl)
      .status(302)
      .send();
  }

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') callbackError: string | undefined,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    if (callbackError) {
      reply
        .header('cache-control', 'no-store')
        .header('referrer-policy', 'no-referrer')
        .header('set-cookie', clearCookie(TRANSACTION_COOKIE, '/api/auth', this.secureCookies))
        .header('location', '/dashboard-v2?auth=failed')
        .status(303)
        .send();
      return;
    }
    const completed = await this.oidc.complete({
      code: code || null,
      state: state || null,
      transactionCookie: readCookie(request, TRANSACTION_COOKIE),
    });
    const maxAge = this.environment.sessionCookieMaxAgeSeconds;
    reply
      .header('cache-control', 'no-store')
      .header('referrer-policy', 'no-referrer')
      .header('set-cookie', [
        cookie(this.environment.sessionCookieName, completed.sessionToken, {
          maxAge,
          path: '/',
          httpOnly: this.environment.sessionCookieHttpOnly !== false,
          sameSite: sameSite(this.environment.sessionCookieSameSite ?? 'lax'),
          secure: this.secureCookies,
        }),
        cookie(CSRF_COOKIE, completed.csrfToken, {
          maxAge,
          path: '/',
          httpOnly: false,
          sameSite: 'Strict',
          secure: this.secureCookies,
        }),
        clearCookie(TRANSACTION_COOKIE, '/api/auth', this.secureCookies),
      ])
      .header('location', completed.returnPath)
      .status(303)
      .send();
  }

  @Post('logout')
  async logout(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const origin = singleHeader(request.headers.origin);
    if (!this.environment.appUrl || origin !== this.environment.appUrl) {
      throw new ApiError(403, 'CSRF_ORIGIN_INVALID', 'The request origin could not be verified.');
    }
    const csrfHeader = singleHeader(request.headers['x-csrf-token']);
    const csrfCookie = readCookie(request, CSRF_COOKIE);
    if (!csrfHeader || !csrfCookie || !safeEqual(csrfHeader, csrfCookie)) {
      throw new ApiError(403, 'CSRF_TOKEN_INVALID', 'The request could not be verified.');
    }
    await this.sessions.logout(
      readCookie(request, this.environment.sessionCookieName),
      csrfHeader,
    );
    reply
      .header('cache-control', 'no-store')
      .header('set-cookie', [
        clearCookie(this.environment.sessionCookieName, '/', this.secureCookies),
        clearCookie(CSRF_COOKIE, '/', this.secureCookies),
      ])
      .status(204)
      .send();
  }

  private get secureCookies() {
    return this.environment.sessionCookieSecure ?? this.environment.nodeEnv === 'production';
  }
}

type CookieOptions = {
  maxAge: number;
  path: string;
  httpOnly: boolean;
  sameSite: 'Lax' | 'Strict';
  secure: boolean;
};

function cookie(name: string, value: string, options: CookieOptions) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    options.httpOnly ? 'HttpOnly' : '',
    options.secure ? 'Secure' : '',
    `SameSite=${options.sameSite}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
  ];
  return parts.filter(Boolean).join('; ');
}

function clearCookie(name: string, path: string, secure: boolean) {
  return cookie(name, '', {
    maxAge: 0,
    path,
    httpOnly: name !== CSRF_COOKIE,
    sameSite: name === CSRF_COOKIE ? 'Strict' : 'Lax',
    secure,
  });
}

function readCookie(request: FastifyRequest, name: string) {
  const header = singleHeader(request.headers.cookie);
  for (const item of header.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 1 || item.slice(0, separator).trim() !== name) continue;
    try {
      const value = decodeURIComponent(item.slice(separator + 1).trim());
      return /^[A-Za-z0-9_-]{40,4096}$/.test(value) ? value : '';
    } catch {
      return '';
    }
  }
  return '';
}

function singleHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sameSite(value: 'lax'): 'Lax' {
  return value === 'lax' ? 'Lax' : 'Lax';
}
