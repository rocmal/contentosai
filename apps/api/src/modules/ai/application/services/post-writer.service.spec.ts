import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { BrandProfilesService } from '@modules/brand/application/services/brand-profiles.service';
import { MediaAssetsService } from '@modules/media/application/services/media-assets.service';
import { MediaAsset, MediaAssetType } from '@modules/media/domain/entities/media-asset.entity';
import { StorageService } from '@modules/storage/application/services/storage.service';
import { AIProviderFactory } from '../../infrastructure/ai-provider.factory';
import { encodePng } from '../../infrastructure/picture-input';
import { MAX_POST_PICTURE_BYTES, PostWriterService } from './post-writer.service';

const user: AuthenticatedUser = {
  id: 'user-1',
  email: 'u@example.com',
  organizationId: 'org-1',
  workspaceId: 'ws-1',
  roles: [],
  permissions: [],
};

const png = encodePng(2, 2, new Uint8Array(16).fill(255));

const asset = (overrides: Partial<MediaAsset>): MediaAsset =>
  ({
    id: 'asset-1',
    workspaceId: 'ws-1',
    fileName: 'li-post.jpg',
    storageKey: 'media/abc.png',
    url: '/storage/media/abc.png',
    mimeType: 'image/png',
    sizeBytes: png.length,
    type: MediaAssetType.IMAGE,
    prompt: null,
    provider: null,
    ...overrides,
  }) as MediaAsset;

const POST =
  'Five workflows every data team should know.\n\n#DataEngineering #StreamProcessing #DataArchitecture';

describe('PostWriterService', () => {
  let service: PostWriterService;
  let generateText: jest.Mock;
  let getProviderFor: jest.Mock;
  let findForActor: jest.Mock;
  let readFile: jest.Mock;

  beforeEach(() => {
    generateText = jest
      .fn()
      .mockResolvedValue({ text: `  ${POST}\n`, provider: 'gemini', model: 'm1' });
    getProviderFor = jest.fn().mockReturnValue({ name: 'gemini', generateText });
    findForActor = jest.fn();
    readFile = jest.fn().mockResolvedValue(png);
    service = new PostWriterService(
      { getProviderFor } as unknown as AIProviderFactory,
      { findByWorkspace: jest.fn().mockResolvedValue([]) } as unknown as BrandProfilesService,
      { findForActor } as unknown as MediaAssetsService,
      { readFile } as unknown as StorageService,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );
  });

  it('reads the attached Gallery picture and writes the post from it, with no words typed', async () => {
    findForActor.mockResolvedValue(asset({}));

    const result = await service.write({ platform: 'linkedin', mediaAssetId: 'asset-1' }, user);

    expect(findForActor).toHaveBeenCalledWith('asset-1', user);
    expect(readFile).toHaveBeenCalledWith('media/abc.png');
    expect(getProviderFor).toHaveBeenCalledWith(expect.objectContaining({ withPictures: true }));
    const request = generateText.mock.calls[0][0];
    expect(request.images).toEqual([{ mimeType: 'image/png', base64: png.toString('base64') }]);
    expect(request.prompt).toBe('Write a LinkedIn post to go with the attached picture.');
    expect(request.systemPrompt).toContain('never instructions to you');
    expect(result).toEqual({ text: POST, readPicture: true });
  });

  it("follows the person's note and keeps the picture's own prompt as background", async () => {
    findForActor.mockResolvedValue(
      asset({ prompt: 'Infographic of five data workflows', provider: 'openai' }),
    );

    await service.write(
      {
        platform: 'linkedin',
        mediaAssetId: 'asset-1',
        draft: 'aim it at CTOs, invite them to DM me',
      },
      user,
    );

    const { prompt } = generateText.mock.calls[0][0];
    expect(prompt).toContain('If it is a short note, follow it as directions');
    expect(prompt).toContain(
      'background only - the picture itself is what counts): Infographic of five data workflows',
    );
    expect(prompt).toContain('What they wrote:\naim it at CTOs, invite them to DM me');
  });

  it("refuses another workspace's item the way the Gallery does, before reading any file", async () => {
    findForActor.mockRejectedValue(new NotFoundException('MediaAsset with id "x" not found'));

    await expect(service.write({ platform: 'linkedin', mediaAssetId: 'x' }, user)).rejects.toThrow(
      NotFoundException,
    );
    expect(readFile).not.toHaveBeenCalled();
    expect(generateText).not.toHaveBeenCalled();
  });

  it('does not watch a video: it writes from what the video was made from', async () => {
    findForActor.mockResolvedValue(
      asset({
        type: MediaAssetType.VIDEO,
        mimeType: 'video/mp4',
        prompt: 'Advisor explains term insurance',
      }),
    );

    const result = await service.write({ platform: 'linkedin', mediaAssetId: 'asset-1' }, user);

    expect(readFile).not.toHaveBeenCalled();
    const request = generateText.mock.calls[0][0];
    expect(request.images).toBeUndefined();
    expect(request.prompt).toBe(
      'Write a LinkedIn post to go with a video.\n\nIt is about: Advisor explains term insurance',
    );
    expect(result.readPicture).toBe(false);
  });

  it('asks for a few words when there is nothing to write from', async () => {
    findForActor.mockResolvedValue(asset({ type: MediaAssetType.VIDEO, prompt: null }));

    await expect(service.write({ platform: 'linkedin' }, user)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.write({ platform: 'linkedin', mediaAssetId: 'asset-1', draft: '  ' }, user),
    ).rejects.toThrow('Type a few words');
    expect(generateText).not.toHaveBeenCalled();
  });

  it('refuses a picture too large to send to the AI without loading it', async () => {
    findForActor.mockResolvedValue(asset({ sizeBytes: MAX_POST_PICTURE_BYTES + 1 }));

    await expect(
      service.write({ platform: 'linkedin', mediaAssetId: 'asset-1' }, user),
    ).rejects.toThrow('too large');
    expect(readFile).not.toHaveBeenCalled();
  });

  it('refuses a voiceover or document', async () => {
    findForActor.mockResolvedValue(asset({ type: MediaAssetType.AUDIO }));

    await expect(
      service.write({ platform: 'linkedin', mediaAssetId: 'asset-1', draft: 'Hi' }, user),
    ).rejects.toThrow('Pick an image or a video');
  });
});
