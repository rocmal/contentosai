import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { Integration, IntegrationStatus } from '../entities/integration.entity';

export interface CreateIntegrationData {
  organizationId: string;
  workspaceId: string;
  provider: string;
  status?: IntegrationStatus;
  encryptedCredentials?: string | null;
}

export type UpdateIntegrationData = Partial<
  Omit<CreateIntegrationData, 'organizationId' | 'workspaceId'>
>;

export const INTEGRATIONS_REPOSITORY = Symbol('INTEGRATIONS_REPOSITORY');

export type IIntegrationsRepository = IBaseRepository<
  Integration,
  CreateIntegrationData,
  UpdateIntegrationData
>;
