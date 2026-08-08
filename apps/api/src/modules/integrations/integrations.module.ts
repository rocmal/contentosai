import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { IntegrationModel } from './infrastructure/persistence/integration.model';
import { IntegrationsRepository } from './infrastructure/persistence/integrations.repository';
import { INTEGRATIONS_REPOSITORY } from './domain/repositories/integration-repository.interface';
import { MetaGraphApiClient } from './infrastructure/meta-graph-api.client';
import { LinkedInApiClient } from './infrastructure/linkedin-api.client';
import { YouTubeApiClient } from './infrastructure/youtube-api.client';
import { IntegrationsService } from './application/services/integrations.service';
import { MetaConnectService } from './application/services/meta-connect.service';
import { LinkedInConnectService } from './application/services/linkedin-connect.service';
import { YouTubeConnectService } from './application/services/youtube-connect.service';
import { IntegrationsController } from './presentation/integrations.controller';
import { MetaConnectController } from './presentation/meta-connect.controller';
import { LinkedInConnectController } from './presentation/linkedin-connect.controller';
import { YouTubeConnectController } from './presentation/youtube-connect.controller';

@Module({
  imports: [SequelizeModule.forFeature([IntegrationModel])],
  controllers: [
    IntegrationsController,
    MetaConnectController,
    LinkedInConnectController,
    YouTubeConnectController,
  ],
  providers: [
    IntegrationsService,
    MetaConnectService,
    MetaGraphApiClient,
    LinkedInConnectService,
    LinkedInApiClient,
    YouTubeConnectService,
    YouTubeApiClient,
    { provide: INTEGRATIONS_REPOSITORY, useClass: IntegrationsRepository },
  ],
  exports: [IntegrationsService, INTEGRATIONS_REPOSITORY],
})
export class IntegrationsModule {}
