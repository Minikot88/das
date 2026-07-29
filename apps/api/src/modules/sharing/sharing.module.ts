import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PublicSharingController, SharingController } from './sharing.controller.js';
import { SharingService } from './sharing.service.js';
import { ExternalSourcesModule } from '../external-sources/external-sources.module.js';

@Module({ imports: [DatabaseModule, AuthModule, ExternalSourcesModule], controllers: [SharingController, PublicSharingController], providers: [SharingService] })
export class SharingModule {}
