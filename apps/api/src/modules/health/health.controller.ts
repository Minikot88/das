import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { Controller, Get, Inject } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../app/config/environment.js';
import { ENVIRONMENT } from '../../app/config/token.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { EncryptedSecretStore } from '../../infrastructure/secrets/encrypted-secret-store.js';
import { ApiError } from '../../shared/http/api-error.js';

@Controller('api/v1')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment,
  ) {}
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const migrationState = await this.prisma.$queryRaw<Array<{ applied_count: bigint; failed_count: bigint }>>`
        SELECT
          COUNT(*) FILTER (WHERE finished_at IS NOT NULL)::bigint AS applied_count,
          COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::bigint AS failed_count
        FROM "_prisma_migrations"
      `;
      if (!migrationState.length || migrationState[0].applied_count < 1n || migrationState[0].failed_count > 0n) {
        throw new Error('Migration state is incomplete.');
      }

      await mkdir(this.environment.fileStoragePath, { recursive: true });
      await access(this.environment.fileStoragePath, constants.R_OK | constants.W_OK);
      if (!this.environment.secretMasterKey) throw new Error('Secret encryption provider is not configured.');
      new EncryptedSecretStore(this.environment.secretMasterKey);

      return {
        status: 'ready',
        dependencies: {
          database: 'ready',
          migrations: 'ready',
          fileStorage: 'ready',
          secretEncryption: 'ready',
          environment: 'ready',
        },
      };
    } catch {
      throw new ApiError(503, 'DATABASE_NOT_READY', 'Database is not ready.', undefined, true);
    }
  }
}
