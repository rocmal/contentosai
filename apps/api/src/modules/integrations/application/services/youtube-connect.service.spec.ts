import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '@shared/security/encryption.service';
import { YouTubeApiClient } from '../../infrastructure/youtube-api.client';
import { IntegrationsService } from './integrations.service';
import { YouTubeConnectService } from './youtube-connect.service';

describe('YouTubeConnectService.check', () => {
  const make = (credentials: Record<string, unknown> | null, check: jest.Mock) =>
    new YouTubeConnectService(
      { checkChannel: check, hasGoogleClient: () => true } as unknown as YouTubeApiClient,
      {} as EncryptionService,
      {
        getDecryptedCredentials: jest.fn().mockResolvedValue(credentials),
      } as unknown as IntegrationsService,
      {} as ConfigService,
    );

  it('reports no connection', async () => {
    const check = jest.fn();
    await expect(make(null, check).check('w1')).resolves.toEqual({ connected: false });
    expect(check).not.toHaveBeenCalled();
  });

  it('confirms a working sign-in with the channel name', async () => {
    const check = jest.fn().mockResolvedValue({ channelTitle: 'My channel' });
    await expect(
      make({ refreshToken: 'r', channelTitle: 'Old name' }, check).check('w1'),
    ).resolves.toEqual({
      connected: true,
      working: true,
      channelTitle: 'My channel',
    });
    expect(check).toHaveBeenCalledWith('r');
  });

  it('says to reconnect when Google no longer accepts the sign-in', async () => {
    const check = jest.fn().mockRejectedValue(new Error('invalid_grant'));
    await expect(
      make({ refreshToken: 'r', channelTitle: 'My channel' }, check).check('w1'),
    ).resolves.toEqual({
      connected: true,
      working: false,
      channelTitle: 'My channel',
      problem: 'The YouTube sign-in has expired or was removed. Reconnect YouTube.',
    });
  });

  it('says the server is not set up when the Google client is missing', async () => {
    const check = jest.fn();
    const service = new YouTubeConnectService(
      { checkChannel: check, hasGoogleClient: () => false } as unknown as YouTubeApiClient,
      {} as EncryptionService,
      {
        getDecryptedCredentials: jest
          .fn()
          .mockResolvedValue({ refreshToken: 'r', channelTitle: 'My channel' }),
      } as unknown as IntegrationsService,
      {} as ConfigService,
    );

    await expect(service.check('w1')).resolves.toEqual(
      expect.objectContaining({ connected: true, working: false, channelTitle: 'My channel' }),
    );
    expect((await service.check('w1')).problem).toContain('not set up on this server');
    expect(check).not.toHaveBeenCalled();
  });
});
