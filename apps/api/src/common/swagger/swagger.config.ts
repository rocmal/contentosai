import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export function setupSwagger(app: INestApplication): void {
  const config = app.get(ConfigService);
  const rawPrefix = config.get<string>('app.apiPrefix') ?? '/api/v1';
  const basePrefix = rawPrefix.replace(/\/v\d+$/, '').replace(/^\/|\/$/g, '') || 'api';

  const documentConfig = new DocumentBuilder()
    .setTitle('Lumora API')
    .setDescription(
      'Lumora - AI Content Operating System. REST API for content generation, automation, publishing and analytics.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addTag('auth', 'Authentication, tokens and OAuth')
    .addTag('users', 'User accounts')
    .addTag('organizations', 'Organizations (top-level tenants)')
    .addTag('workspaces', 'Workspaces within an organization')
    .addTag('roles', 'Roles')
    .addTag('permissions', 'Permissions')
    .addTag('campaigns', 'Marketing campaigns')
    .addTag('content', 'Generated and authored content')
    .addTag('ai', 'AI content generation')
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup(`${basePrefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
