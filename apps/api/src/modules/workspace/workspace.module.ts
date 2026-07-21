import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { WorkspaceDataService } from './application/workspace-data.service.js';
import { LegacyWorkspaceController } from './presentation/legacy-workspace.controller.js';

@Module({ imports: [AuthModule, DatabaseModule], controllers: [LegacyWorkspaceController], providers: [WorkspaceDataService] })
export class WorkspaceModule {}
