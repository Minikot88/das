import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import type { RuntimeEnvironment } from '../../app/config/environment.js';
import { ENVIRONMENT } from '../../app/config/token.js';
import { PrismaClient } from './generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment) {
    super({ adapter: new PrismaMariaDb(environment.databaseUrl || 'mysql://dashboard:dashboard@127.0.0.1:3307/dashboard_mini_bi') });
  }
  async onModuleInit() { if (this.environment.nodeEnv !== 'test') await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
