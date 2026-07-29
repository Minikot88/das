import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { WorkspaceDataService } from './application/workspace-data.service.js';
import { LegacyWorkspaceController } from './presentation/legacy-workspace.controller.js';
import { WorkspaceV1Controller } from './presentation/workspace-v1.controller.js';

@Module({ imports: [AuthModule, DatabaseModule], controllers: [LegacyWorkspaceController, WorkspaceV1Controller], providers: [WorkspaceDataService] })
export class WorkspaceModule {}
