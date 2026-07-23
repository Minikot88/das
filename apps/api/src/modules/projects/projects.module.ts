import { Module } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../app/config/environment.js';
import { ENVIRONMENT } from '../../app/config/token.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PROJECT_REPOSITORY } from './application/project.repository.js';
import { ProjectService } from './application/project.service.js';
import { MemoryProjectRepository } from './infrastructure/memory-project.repository.js';
import { PrismaProjectRepository } from './infrastructure/prisma-project.repository.js';
import { LegacyProjectsController } from './presentation/legacy-projects.controller.js';
import { ProjectsController } from './presentation/projects.controller.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ProjectsController, LegacyProjectsController],
  providers: [ProjectService, MemoryProjectRepository, PrismaProjectRepository, {
    provide: PROJECT_REPOSITORY,
    inject: [ENVIRONMENT, MemoryProjectRepository, PrismaProjectRepository],
    useFactory: (environment: RuntimeEnvironment, memory: MemoryProjectRepository, prisma: PrismaProjectRepository) => environment.nodeEnv === 'test' ? memory : prisma,
  }],
})
export class ProjectsModule {}
