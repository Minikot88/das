import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { map, type Observable } from 'rxjs';
import { ensureRequestId } from './request-id.js';

@Injectable()
export class ApiEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { requestId?: string }>();
    if (!request.url.startsWith('/api/v1')) return next.handle();
    const requestId = ensureRequestId(request);
    return next.handle().pipe(map(data => ({ data, requestId, ...(data && typeof data === 'object' && 'revision' in data ? { revision: (data as { revision: number }).revision } : {}) })));
  }
}
