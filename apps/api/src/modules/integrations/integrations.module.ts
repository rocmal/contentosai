import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { IntegrationModel } from './infrastructure/persistence/integration.model';
import { IntegrationsRepository } from './infrastructure/persistence/integrations.repository';
import { INTEGRATIONS_REPOSITORY } from './domain/repositories/integration-repository.interface';
import { IntegrationsService } from './application/services/integrations.service';
import { IntegrationsController } from './presentation/integrations.controller';

@Module({
  imports: [SequelizeModule.forFeature([IntegrationModel])],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    { provide: INTEGRATIONS_REPOSITORY, useClass: IntegrationsRepository },
  ],
  exports: [IntegrationsService, INTEGRATIONS_REPOSITORY],
})
export class IntegrationsModule {}
