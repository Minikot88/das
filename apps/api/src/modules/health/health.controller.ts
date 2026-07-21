import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../shared/http/api-error.js';

@Controller('api/v1')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', dependencies: { database: 'ready' } };
    } catch {
      throw new ApiError(503, 'DATABASE_NOT_READY', 'Database is not ready.', undefined, true);
    }
  }
}
