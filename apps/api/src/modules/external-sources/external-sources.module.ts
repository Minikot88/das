import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { ExternalSourcesService } from './external-sources.service.js';

@Module({ imports: [DatabaseModule], providers: [ExternalSourcesService], exports: [ExternalSourcesService] })
export class ExternalSourcesModule {}
