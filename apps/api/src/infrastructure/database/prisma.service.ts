import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import type { RuntimeEnvironment } from '../../app/config/environment.js';
import { ENVIRONMENT } from '../../app/config/token.js';
import { PrismaClient } from './generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment) {
    super({
      adapter: new PrismaPg({
        connectionString: environment.databaseUrl || 'postgresql://dashboard_app:dashboard-local-only@127.0.0.1:5432/dashboard_mini_bi',
        max: environment.databasePoolMax,
        idleTimeoutMillis: 30_000,
        statement_timeout: environment.queryTimeoutMs,
        idle_in_transaction_session_timeout: 30_000,
      }),
    });
  }
  async onModuleInit() { if (this.environment.nodeEnv !== 'test') await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
