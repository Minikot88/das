import { createHash } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ApiError } from '../../../shared/http/api-error.js';
import { normalizeEmail } from '../domain/auth-security.js';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ ip?: string; body?: { email?: string } }>();
    const now = Date.now();
    if (this.attempts.size > 10_000) for (const [key, value] of this.attempts) if (value.resetAt <= now) this.attempts.delete(key);
    const identity = normalizeEmail(String(request.body?.email || ''));
    const key = createHash('sha256').update(`${request.ip || 'unknown'}\0${identity}`, 'utf8').digest('hex');
    const bucket = this.attempts.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + 5 * 60_000 });
      return true;
    }
    bucket.count += 1;
    if (bucket.count > 10) throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.', undefined, true);
    return true;
  }
}
