import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './session.guard.js';

export const CurrentPrincipal = createParamDecorator((_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<AuthenticatedRequest>().principal!);
