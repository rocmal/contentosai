import { EventEmitter2 } from '@nestjs/event-emitter';
import { EncryptionService } from '@shared/security/encryption.service';
import { Integration, IntegrationStatus } from '../../domain/entities/integration.entity';
import { IIntegrationsRepository } from '../../domain/repositories/integration-repository.interface';
import { IntegrationsService } from './integrations.service';

describe('IntegrationsService', () => {
  let repository: jest.Mocked<IIntegrationsRepository>;
  let encryption: jest.Mocked<Pick<EncryptionService, 'encrypt' | 'decrypt'>>;
  let service: IntegrationsService;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IIntegrationsRepository>;
    encryption = {
      encrypt: jest.fn(),
      decrypt: jest.fn((value: string) => value),
    };
    service = new IntegrationsService(
      repository,
      encryption as unknown as EncryptionService,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );
  });

  describe('disconnect', () => {
    it('wipes the stored token before deleting the connection', async () => {
      repository.findOne.mockResolvedValue({ id: 'i1' } as Integration);

      await expect(service.disconnect('w1', 'linkedin', 'u1')).resolves.toBe(true);

      expect(repository.update).toHaveBeenCalledWith(
        'i1',
        { status: IntegrationStatus.DISCONNECTED, encryptedCredentials: null },
        'u1',
      );
      expect(repository.delete).toHaveBeenCalledWith('i1', 'u1');
      expect(repository.update.mock.invocationCallOrder[0]).toBeLessThan(
        repository.delete.mock.invocationCallOrder[0],
      );
    });

    it('says so when nothing was connected', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.disconnect('w1', 'linkedin')).resolves.toBe(false);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('LinkedIn expiry', () => {
    it('reports when the LinkedIn sign-in runs out, and whether it already has', async () => {
      const expiresAt = Date.UTC(2026, 11, 18);
      repository.findOne.mockImplementation(async (filters) =>
        filters.provider === 'linkedin'
          ? ({
              encryptedCredentials: JSON.stringify({ memberName: 'Puneet', expiresAt }),
            } as Integration)
          : null,
      );

      const status = await service.getConnectionStatus('w1');

      expect(status.linkedin).toEqual({
        connected: true,
        label: 'Puneet',
        expiresAt: new Date(expiresAt).toISOString(),
        expired: expiresAt <= Date.now(),
      });
      expect(status.facebook).toEqual({ connected: false, label: undefined });
    });

    it('lists connected LinkedIn profiles with their expiry, for the reminders', async () => {
      repository.findAll.mockResolvedValue({
        items: [
          {
            workspaceId: 'w1',
            createdBy: 'u1',
            updatedBy: 'u2',
            encryptedCredentials: JSON.stringify({
              memberName: 'Puneet',
              expiresAt: 1_800_000_000_000,
            }),
          },
          {
            workspaceId: 'w2',
            createdBy: 'u3',
            updatedBy: null,
            encryptedCredentials: JSON.stringify({}),
          },
        ] as Integration[],
        meta: { totalItems: 2, itemCount: 2, itemsPerPage: 1000, totalPages: 1, currentPage: 1 },
      });

      await expect(service.listLinkedInExpiries()).resolves.toEqual([
        {
          workspaceId: 'w1',
          userId: 'u2',
          memberName: 'Puneet',
          expiresAt: new Date(1_800_000_000_000),
        },
      ]);
      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { provider: 'linkedin', status: IntegrationStatus.CONNECTED },
        }),
      );
    });
  });
});
