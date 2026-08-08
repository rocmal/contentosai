import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EncryptionService } from '@shared/security/encryption.service';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { Integration, IntegrationStatus } from '../../domain/entities/integration.entity';
import {
  IIntegrationsRepository,
  INTEGRATIONS_REPOSITORY,
} from '../../domain/repositories/integration-repository.interface';
import { CreateIntegrationDto } from '../dto/create-integration.dto';
import { UpdateIntegrationDto } from '../dto/update-integration.dto';
import { IntegrationCreatedEvent } from '../events/integration-created.event';

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(INTEGRATIONS_REPOSITORY)
    private readonly integrationsRepository: IIntegrationsRepository,
    private readonly encryptionService: EncryptionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateIntegrationDto, actorId?: string): Promise<Integration> {
    const hasCredentials = dto.credentials !== undefined;

    const integration = await this.integrationsRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        provider: dto.provider,
        status: hasCredentials ? IntegrationStatus.CONNECTED : IntegrationStatus.DISCONNECTED,
        encryptedCredentials: hasCredentials
          ? this.encryptionService.encrypt(JSON.stringify(dto.credentials))
          : null,
      },
      actorId,
    );

    this.eventEmitter.emit(
      'integrations.created',
      new IntegrationCreatedEvent(integration.id, integration.workspaceId),
    );

    return integration;
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<Integration>> {
    return this.integrationsRepository.findAll(options);
  }

  async findById(id: string): Promise<Integration> {
    const integration = await this.integrationsRepository.findById(id);
    if (!integration) {
      throw new NotFoundException(`Integration with id "${id}" not found`);
    }
    return integration;
  }

  async update(id: string, dto: UpdateIntegrationDto, actorId?: string): Promise<Integration> {
    await this.findById(id);
    const hasCredentials = dto.credentials !== undefined;

    return this.integrationsRepository.update(
      id,
      {
        provider: dto.provider,
        status: hasCredentials ? IntegrationStatus.CONNECTED : undefined,
        encryptedCredentials: hasCredentials
          ? this.encryptionService.encrypt(JSON.stringify(dto.credentials))
          : undefined,
      },
      actorId,
    );
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.integrationsRepository.delete(id, actorId);
  }

  /** Upserts a single connected-account row per workspace+provider, so
   * reconnecting (e.g. re-running the Meta OAuth flow) refreshes the
   * existing credentials instead of accumulating duplicate rows. */
  async connect(
    organizationId: string,
    workspaceId: string,
    provider: string,
    credentials: Record<string, unknown>,
    actorId?: string,
  ): Promise<Integration> {
    const existing = await this.integrationsRepository.findOne({ workspaceId, provider });
    const encryptedCredentials = this.encryptionService.encrypt(JSON.stringify(credentials));

    if (existing) {
      return this.integrationsRepository.update(
        existing.id,
        { status: IntegrationStatus.CONNECTED, encryptedCredentials },
        actorId,
      );
    }

    const integration = await this.integrationsRepository.create(
      {
        organizationId,
        workspaceId,
        provider,
        status: IntegrationStatus.CONNECTED,
        encryptedCredentials,
      },
      actorId,
    );
    this.eventEmitter.emit(
      'integrations.created',
      new IntegrationCreatedEvent(integration.id, integration.workspaceId),
    );
    return integration;
  }

  async getDecryptedCredentials(
    workspaceId: string,
    provider: string,
  ): Promise<Record<string, unknown> | null> {
    const integration = await this.integrationsRepository.findOne({
      workspaceId,
      provider,
      status: IntegrationStatus.CONNECTED,
    });
    if (!integration?.encryptedCredentials) {
      return null;
    }
    return JSON.parse(this.encryptionService.decrypt(integration.encryptedCredentials)) as Record<
      string,
      unknown
    >;
  }

  async getConnectionStatus(
    workspaceId: string,
  ): Promise<Record<string, { connected: boolean; label?: string }>> {
    const [facebook, instagram, linkedin, youtube] = await Promise.all([
      this.getDecryptedCredentials(workspaceId, 'facebook'),
      this.getDecryptedCredentials(workspaceId, 'instagram'),
      this.getDecryptedCredentials(workspaceId, 'linkedin'),
      this.getDecryptedCredentials(workspaceId, 'youtube'),
    ]);
    return {
      facebook: { connected: !!facebook, label: (facebook?.pageName as string) ?? undefined },
      instagram: { connected: !!instagram, label: (instagram?.igUsername as string) ?? undefined },
      linkedin: { connected: !!linkedin, label: (linkedin?.memberName as string) ?? undefined },
      youtube: { connected: !!youtube, label: (youtube?.channelTitle as string) ?? undefined },
    };
  }
}
