import 'reflect-metadata';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import type { FastifyRequest } from 'fastify';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../app.module.js';
import { parseEnvironment } from '../config/environment.js';
import { ApiEnvelopeInterceptor } from '../../shared/http/api-envelope.interceptor.js';
import { ApiExceptionFilter } from '../../shared/http/api-exception.filter.js';
import { ensureRequestId } from '../../shared/http/request-id.js';
import { registerMetrics } from '../../infrastructure/monitoring/metrics.js';

export const securityHeadersOptions = {
  contentSecurityPolicy: false,
  hsts: { includeSubDomains: false, preload: false },
};

export const corsOptions = (origins: string[]) => ({
  origin: origins,
  credentials: true,
});

export async function createApplication(input: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): Promise<NestFastifyApplication> {
  const environment = parseEnvironment(input);
  const logger: false | Array<'log' | 'warn' | 'error' | 'debug'> = environment.nodeEnv === 'test'
    ? false
    : environment.logLevel === 'debug' ? ['log', 'warn', 'error', 'debug']
      : environment.logLevel === 'info' ? ['log', 'warn', 'error']
        : environment.logLevel === 'warn' ? ['warn', 'error']
          : ['error'];
  const app = await NestFactory.create<NestFastifyApplication>(AppModule.configured(environment), new FastifyAdapter({
    bodyLimit: 6 * 1024 * 1024,
    trustProxy: ['loopback', 'linklocal', 'uniquelocal'],
  }), { logger, abortOnError: false });
  await app.register(helmet, securityHeadersOptions);
  await app.register(cors, corsOptions(environment.corsOrigins));
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  await app.register(multipart, { limits: { fileSize: environment.maxUploadSize, files: 1, fields: 20 } });
  registerMetrics(app.getHttpAdapter().getInstance(), environment);
  app.getHttpAdapter().getInstance().addHook('onRequest', (request: FastifyRequest, _reply, done) => {
    ensureRequestId(request);
    done();
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ApiEnvelopeInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
