import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ExportsController } from './exports.controller.js';
import { ExportsService } from './exports.service.js';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [ExportsController], providers: [ExportsService] })
export class ExportsModule {}
