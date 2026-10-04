import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { ImageService } from './image.service';
import {
  IMAGE_ASPECT_RATIOS,
  nearestStandardOpenAiSize,
  openAiSizeFor,
} from '../../domain/image-formats';
import { imageCreditCost } from '@modules/credits/credits.constants';

const user: AuthenticatedUser = {
  id: 'u1',
  email: 'u@example.com',
  organizationId: 'org-1',
  workspaceId: 'ws-1',
  roles: [],
  permissions: [],
};

const JPEG_DATA_URI = `data:image/jpeg;base64,${Buffer.from('fake-image-bytes').toString('base64')}`;

function makeService(providerResult: unknown = { provider: 'openai', model: 'gpt-image-2', status: 'completed', images: [JPEG_DATA_URI] }) {
  const generateImage = jest.fn().mockResolvedValue(providerResult);
  const credits = { reserve: jest.fn().mockResolvedValue(undefined), refund: jest.fn().mockResolvedValue(undefined) };
  const storage = { uploadFile: jest.fn().mockResolvedValue({ key: 'k', url: 'https://cdn/x.jpg' }) };
  const media = { findCached: jest.fn().mockResolvedValue(null), saveGenerated: jest.fn().mockResolvedValue(undefined) };
  const service = new ImageService(
    { getProvider: () => ({ name: 'openai', generateImage }), listProviders: () => ['openai', 'stability'] } as never,
    storage as never,
    media as never,
    { emit: jest.fn() } as never,
    credits as never,
    { get: (key: string) => (key === 'ai.image.openai.apiKey' ? 'sk-test' : '') } as never,
  );
  return { service, generateImage, credits, storage, media };
}

describe('openAiSizeFor', () => {
  it.each(IMAGE_ASPECT_RATIOS)('gives a valid gpt-image custom size for %s', (ratio) => {
    const [w, h] = openAiSizeFor(ratio).split('x').map(Number);
    expect(w % 16).toBe(0);
    expect(h % 16).toBe(0);
    expect(w / h).toBeGreaterThanOrEqual(1 / 3);
    expect(w / h).toBeLessThanOrEqual(3);
    expect(w * h).toBeGreaterThanOrEqual(655_360);
    expect(w * h).toBeLessThanOrEqual(8_294_400);
  });

  it('keeps the requested shape closely', () => {
    const [w, h] = openAiSizeFor('16:9').split('x').map(Number);
    expect(Math.abs(w / h - 16 / 9)).toBeLessThan(0.03);
    const [pw, ph] = openAiSizeFor('9:16').split('x').map(Number);
    expect(Math.abs(pw / ph - 9 / 16)).toBeLessThan(0.03);
  });

  it('falls back to one of the three standard sizes', () => {
    expect(nearestStandardOpenAiSize('16:9')).toBe('1536x1024');
    expect(nearestStandardOpenAiSize('9:16')).toBe('1024x1536');
    expect(nearestStandardOpenAiSize('1:1')).toBe('1024x1024');
  });
});

describe('imageCreditCost', () => {
  it('prices each vendor and tier, and falls back to the vendor standard tier', () => {
    expect(imageCreditCost('openai', 'draft')).toBe(1);
    expect(imageCreditCost('openai', 'standard')).toBe(8);
    expect(imageCreditCost('openai', 'high')).toBe(30);
    expect(imageCreditCost('stability', 'standard')).toBe(4);
    expect(imageCreditCost('stability', 'draft')).toBe(4);
  });
});

describe('ImageService.generateImage', () => {
  it('charges the tier price per image and refunds it if the provider fails', async () => {
    const { service, generateImage, credits } = makeService();
    generateImage.mockRejectedValue(new Error('vendor down'));

    await expect(
      service.generateImage({ prompt: 'a cat', provider: 'openai', quality: 'high', count: 2 }, user),
    ).rejects.toThrow('vendor down');

    expect(credits.reserve).toHaveBeenCalledWith(expect.objectContaining({ amount: 60 }));
    expect(credits.refund).toHaveBeenCalledWith(expect.objectContaining({ amount: 60 }));
  });

  it('preview mode returns inline images, stores nothing and still charges', async () => {
    const { service, credits, storage, media, generateImage } = makeService();

    const result = await service.generateImage(
      { prompt: 'a cat', provider: 'openai', aspectRatio: '16:9', quality: 'standard', saveToGallery: false },
      user,
    );

    expect(generateImage).toHaveBeenCalledWith(expect.objectContaining({ aspectRatio: '16:9', quality: 'standard' }));
    expect(credits.reserve).toHaveBeenCalledWith(expect.objectContaining({ amount: 8 }));
    expect(result.creditsUsed).toBe(8);
    expect(result.images[0]).toMatch(/^data:image\/jpeg;base64,/);
    expect(storage.uploadFile).not.toHaveBeenCalled();
    expect(media.saveGenerated).not.toHaveBeenCalled();
    expect(media.findCached).not.toHaveBeenCalled();
  });

  it('default mode saves to storage and the gallery', async () => {
    const { service, storage, media } = makeService();

    const result = await service.generateImage({ prompt: 'a cat', provider: 'openai' }, user);

    expect(storage.uploadFile).toHaveBeenCalledTimes(1);
    expect(media.saveGenerated).toHaveBeenCalledTimes(1);
    expect(result.images).toEqual(['https://cdn/x.jpg']);
  });

  it('a cache hit costs nothing', async () => {
    const { service, credits, media, generateImage } = makeService();
    media.findCached.mockResolvedValue({ url: 'https://cdn/cached.jpg', provider: 'openai', model: 'gpt-image-2' });

    const result = await service.generateImage({ prompt: 'a cat', provider: 'openai' }, user);

    expect(result.creditsUsed).toBe(0);
    expect(credits.reserve).not.toHaveBeenCalled();
    expect(generateImage).not.toHaveBeenCalled();
  });

  it('options report configured vendors and credits from the same table as the charge', () => {
    const { service } = makeService();
    const { providers } = service.getOptions();
    const openai = providers.find((p) => p.id === 'openai')!;
    const stability = providers.find((p) => p.id === 'stability')!;

    expect(openai.configured).toBe(true);
    expect(openai.recommended).toBe(true);
    expect(openai.qualities.map((q) => q.credits)).toEqual([1, 8, 30]);
    expect(stability.configured).toBe(false);
    expect(stability.qualities.map((q) => q.id)).toEqual(['standard', 'high']);
  });
});
