import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { setupSwagger } from '@common/swagger/swagger.config';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  app.useLogger(app.get(Logger));

  // API_PREFIX is authored as "/api/v1" (see .env). The trailing version segment
  // is peeled off and handed to Nest's URI versioning instead of being baked into
  // a static prefix, so new versions (v2, ...) can be added per-controller later
  // without touching this bootstrap or the env contract.
  const rawPrefix = config.get<string>('app.apiPrefix') ?? '/api/v1';
  const versionMatch = rawPrefix.match(/\/v(\d+)$/);
  const defaultVersion = versionMatch ? versionMatch[1] : '1';
  const basePrefix = rawPrefix.replace(/\/v\d+$/, '').replace(/^\/|\/$/g, '') || 'api';

  app.setGlobalPrefix(basePrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion });

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: config.get<boolean>('app.isProduction') ? config.get<string>('app.url') : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  setupSwagger(app);

  const port = config.get<number>('app.port') ?? 3000;
  const host = config.get<string>('app.host') ?? 'localhost';
  await app.listen(port, host);

  Logger.prototype.log.call(
    app.get(Logger),
    `Lumora API listening on http://${host}:${port}/${basePrefix}/v${defaultVersion}`,
  );
}

bootstrap();
