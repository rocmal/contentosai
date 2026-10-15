import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import {
  CustomVoicesService,
  MAX_CUSTOM_VOICES_PER_WORKSPACE,
  MIN_RECORDING_BYTES,
} from './custom-voices.service';

const user = {
  id: 'u1',
  email: 'u@example.com',
  organizationId: 'org-1',
  workspaceId: 'ws-1',
  roles: [],
  permissions: [],
} as AuthenticatedUser;

const goodFile = () => ({
  buffer: Buffer.alloc(MIN_RECORDING_BYTES + 10),
  mimetype: 'audio/webm',
  originalname: 'sample.webm',
});

function build(overrides: { existing?: unknown[]; configured?: boolean } = {}) {
  const provider = {
    healthCheck: jest.fn().mockResolvedValue(overrides.configured ?? true),
    cloneVoice: jest.fn().mockResolvedValue('el-voice-1'),
    deleteVoice: jest.fn().mockResolvedValue(undefined),
  };
  const repository = {
    findAll: jest.fn().mockResolvedValue({ items: overrides.existing ?? [] }),
    findById: jest.fn(),
    update: jest.fn().mockImplementation(async (_id, data) => ({ id: 'cv-1', ...data })),
    create: jest.fn().mockImplementation(async (data) => ({ id: 'cv-1', ...data })),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const storage = {
    uploadFile: jest.fn().mockResolvedValue({ key: 'custom-voices/x.webm' }),
    readFile: jest.fn().mockResolvedValue(Buffer.from('audio')),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const factory = { getProvider: jest.fn().mockReturnValue(provider) };
  const service = new CustomVoicesService(repository as never, factory as never, storage as never);
  return { service, provider, repository, storage };
}

describe('CustomVoicesService.create', () => {
  it('clones the recording, keeps the sample and saves the voice under the given name', async () => {
    const { service, provider, repository } = build();

    const voice = await service.create(user, 'My voice', true, goodFile());

    expect(provider.cloneVoice).toHaveBeenCalledWith(expect.objectContaining({ name: 'My voice' }));
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-1',
        name: 'My voice',
        provider: 'elevenlabs',
        providerVoiceId: 'el-voice-1',
        sampleStorageKey: 'custom-voices/x.webm',
      }),
      'u1',
    );
    expect(voice.providerVoiceId).toBe('el-voice-1');
  });

  it('refuses without the own-voice consent, or with a recording that is too short', async () => {
    const { service, provider } = build();

    await expect(service.create(user, 'My voice', false, goodFile())).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.create(user, 'My voice', true, { ...goodFile(), buffer: Buffer.alloc(100) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.cloneVoice).not.toHaveBeenCalled();
  });

  it('refuses a duplicate name and a full workspace', async () => {
    const dup = build({ existing: [{ name: 'my VOICE' }] });
    await expect(dup.service.create(user, 'My voice', true, goodFile())).rejects.toBeInstanceOf(
      ConflictException,
    );

    const full = build({
      existing: Array.from({ length: MAX_CUSTOM_VOICES_PER_WORKSPACE }, (_, i) => ({
        name: `v${i}`,
      })),
    });
    await expect(full.service.create(user, 'New one', true, goodFile())).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(full.provider.cloneVoice).not.toHaveBeenCalled();
  });

  it('still saves the recording when voice cloning is not configured', async () => {
    const { service, provider, repository } = build({ configured: false });

    const voice = await service.create(user, 'My voice', true, goodFile());

    expect(provider.cloneVoice).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ providerVoiceId: null, sampleStorageKey: 'custom-voices/x.webm' }),
      'u1',
    );
    expect(voice.providerVoiceId).toBeNull();
  });

  it('refuses when cloning is off and the recording cannot be stored either', async () => {
    const { service, storage } = build({ configured: false });
    storage.uploadFile.mockRejectedValue(new Error('disk full'));

    await expect(service.create(user, 'My voice', true, goodFile())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('removes the clone again if saving the voice fails, so no slot is leaked', async () => {
    const { service, provider, repository } = build();
    repository.create.mockRejectedValue(new Error('db down'));

    await expect(service.create(user, 'My voice', true, goodFile())).rejects.toThrow('db down');
    expect(provider.deleteVoice).toHaveBeenCalledWith('el-voice-1');
  });
});

describe('CustomVoicesService.activate', () => {
  const saved = {
    id: 'cv-1',
    workspaceId: 'ws-1',
    name: 'My voice',
    providerVoiceId: null,
    sampleStorageKey: 'custom-voices/x.webm',
  };

  it('clones a saved recording and stores the new voice id', async () => {
    const { service, provider, repository, storage } = build();
    repository.findById.mockResolvedValue(saved);

    const voice = await service.activate('cv-1', user);

    expect(provider.cloneVoice).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My voice', mimeType: 'audio/webm' }),
    );
    expect(voice.providerVoiceId).toBe('el-voice-1');
  });

  it('says so plainly while cloning is still not configured', async () => {
    const { service, repository } = build({ configured: false });
    repository.findById.mockResolvedValue(saved);

    await expect(service.activate('cv-1', user)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('hides voices from other workspaces', async () => {
    const { service, repository } = build();
    repository.findById.mockResolvedValue({ ...saved, workspaceId: 'other' });

    await expect(service.activate('cv-1', user)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CustomVoicesService.remove', () => {
  const voice = {
    id: 'cv-1',
    workspaceId: 'ws-1',
    createdBy: 'u1',
    provider: 'elevenlabs',
    providerVoiceId: 'el-voice-1',
    sampleStorageKey: 'custom-voices/x.webm',
  };

  it('deletes the provider voice, the sample and the row for the creator', async () => {
    const { service, provider, repository, storage } = build();
    repository.findById.mockResolvedValue(voice);

    await service.remove('cv-1', user);

    expect(provider.deleteVoice).toHaveBeenCalledWith('el-voice-1');
    expect(storage.delete).toHaveBeenCalledWith('custom-voices/x.webm');
    expect(repository.delete).toHaveBeenCalledWith('cv-1', 'u1');
  });

  it('only lets the creator delete, and hides voices from other workspaces', async () => {
    const { service, repository } = build();
    repository.findById.mockResolvedValue({ ...voice, createdBy: 'someone-else' });
    await expect(service.remove('cv-1', user)).rejects.toBeInstanceOf(ForbiddenException);

    repository.findById.mockResolvedValue({ ...voice, workspaceId: 'ws-other' });
    await expect(service.remove('cv-1', user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('still deletes the row if the provider delete fails', async () => {
    const { service, provider, repository } = build();
    repository.findById.mockResolvedValue(voice);
    provider.deleteVoice.mockRejectedValue(new Error('vendor down'));

    await service.remove('cv-1', user);

    expect(repository.delete).toHaveBeenCalledWith('cv-1', 'u1');
  });
});
