import { DynamicModule, Global, Module } from '@nestjs/common';
import type { RuntimeEnvironment } from './environment.js';
import { ENVIRONMENT } from './token.js';

@Global()
@Module({})
export class ConfigModule {
  static forRoot(environment: RuntimeEnvironment): DynamicModule {
    return {
      module: ConfigModule,
      global: true,
      providers: [{ provide: ENVIRONMENT, useValue: environment }],
      exports: [ENVIRONMENT],
    };
  }
}
