import { DynamicModule, Module } from '@nestjs/common';
import type { RuntimeEnvironment } from './config/environment.js';
import { ConfigModule } from './config/config.module.js';
import { AuthModule } from '../modules/auth/auth.module.js';
import { HealthController } from '../modules/health/health.controller.js';
import { ProjectsModule } from '../modules/projects/projects.module.js';
import { WorkspaceModule } from '../modules/workspace/workspace.module.js';
import { CoreDataModule } from '../modules/core-data/core-data.module.js';
import { ConnectionsModule } from '../modules/connections/connections.module.js';
import { SharingModule } from '../modules/sharing/sharing.module.js';
import { ExportsModule } from '../modules/exports/exports.module.js';

@Module({
  controllers: [HealthController],
})
export class AppModule {
  static configured(environment: RuntimeEnvironment): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forRoot(environment), AuthModule, ProjectsModule, WorkspaceModule, CoreDataModule, ConnectionsModule, SharingModule, ExportsModule],
    };
  }
}
