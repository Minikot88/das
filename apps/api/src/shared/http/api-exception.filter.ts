import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { RevisionConflictError } from '../domain/revision.js';
import { ApiError } from './api-error.js';
import { ensureRequestId } from './request-id.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<FastifyRequest & { requestId?: string }>();
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const requestId = ensureRequestId(request);
    const error = exception instanceof RevisionConflictError
      ? new ApiError(409, exception.code, exception.message, undefined, false, exception.currentRevision)
      : exception instanceof ApiError
        ? exception
        : exception instanceof HttpException
          ? new ApiError(exception.getStatus(), `HTTP_${exception.getStatus()}`, formatHttpMessage(exception), undefined, exception.getStatus() >= 500)
          : new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.', undefined, true);

    reply.status(error.status).send({
      code: error.code,
      message: error.message,
      requestId,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      retryable: error.retryable,
      ...(error.currentRevision !== undefined ? { currentRevision: error.currentRevision } : {}),
    });
  }
}

function formatHttpMessage(exception: HttpException): string {
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  const message = body && typeof body === 'object' && 'message' in body ? (body as { message: string | string[] }).message : exception.message;
  return Array.isArray(message) ? message.join(', ') : message;
}
