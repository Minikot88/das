import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ExternalSourcesModule } from '../external-sources/external-sources.module.js';
import { CoreDataController } from './core-data.controller.js';
import { CoreDataService } from './core-data.service.js';

@Module({ imports: [DatabaseModule, AuthModule, ExternalSourcesModule], controllers: [CoreDataController], providers: [CoreDataService], exports: [CoreDataService] })
export class CoreDataModule {}
