import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import { join } from 'path';
import { AppModule } from './app.module';
import { setupSwagger } from '@common/swagger/swagger.config';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  app.useLogger(app.get(Logger));

  // Registered before useStaticAssets below - Express/Nest middleware runs
  // in registration order, and useStaticAssets fully handles matching
  // requests itself. If CORS were registered after it, every response from
  // /storage/uploads/* would skip the CORS middleware entirely and never
  // get an Access-Control-Allow-Origin header, breaking any consumer that
  // loads an uploaded file with crossOrigin="anonymous" (e.g. the video
  // compositor, which needs that to export a canvas containing the image).
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: config.get<boolean>('app.isProduction') ? config.get<string>('app.frontendUrl') : true,
    credentials: true,
  });

  // LocalStorageProvider.getUrl() hands out "{APP_URL}/storage/uploads/{key}"
  // for every uploaded asset (see local-storage.provider.ts) - that path has
  // to actually be served, or every consumer of an uploaded file's URL
  // (e.g. Meta's Graph API fetching a video to publish) gets a 404.
  app.useStaticAssets(join(process.cwd(), config.get<string>('storage.local.path') ?? 'storage', 'uploads'), {
    prefix: '/storage/uploads/',
    setHeaders: (res) => {
      // helmet()'s default Cross-Origin-Resource-Policy: same-origin blocks
      // cross-origin loads of this response independently of the CORS
      // headers above - browsers enforce it before ever checking
      // Access-Control-Allow-Origin. This route is intentionally public and
      // cross-origin-embeddable by design (canvas exports via
      // crossOrigin="anonymous", external platforms like Meta's Graph API
      // fetching published media), so it needs an explicit opt-out here
      // rather than weakening CORP for the rest of the API.
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  // Reflector has no dependencies of its own, so it's safe to instantiate
  // directly here rather than pulling TransformInterceptor into DI via
  // APP_INTERCEPTOR just for this one constructor argument.
  app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));

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
