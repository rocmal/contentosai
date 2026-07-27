import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { Integration } from '../../domain/entities/integration.entity';
import {
  CreateIntegrationData,
  IIntegrationsRepository,
  UpdateIntegrationData,
} from '../../domain/repositories/integration-repository.interface';
import { IntegrationModel } from './integration.model';

@Injectable()
export class IntegrationsRepository
  extends BaseRepository<
    IntegrationModel,
    Integration,
    CreateIntegrationData,
    UpdateIntegrationData
  >
  implements IIntegrationsRepository
{
  constructor(@InjectModel(IntegrationModel) model: typeof IntegrationModel) {
    super(model);
  }

  protected toEntity(instance: IntegrationModel): Integration {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      provider: plain.provider,
      status: plain.status,
      encryptedCredentials: plain.encryptedCredentials,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
