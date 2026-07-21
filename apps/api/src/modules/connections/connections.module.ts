import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ConnectionsController } from './connections.controller.js';
import { ConnectionsService } from './connections.service.js';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [ConnectionsController], providers: [ConnectionsService] })
export class ConnectionsModule {}
