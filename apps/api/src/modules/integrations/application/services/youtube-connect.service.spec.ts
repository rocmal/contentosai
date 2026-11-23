import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '@shared/security/encryption.service';
import { YouTubeApiClient } from '../../infrastructure/youtube-api.client';
import { IntegrationsService } from './integrations.service';
import { YouTubeConnectService } from './youtube-connect.service';

describe('YouTubeConnectService.check', () => {
  const make = (
    credentials: Record<string, unknown> | null,
    check: jest.Mock,
    clientAccepted: boolean | null = true,
  ) =>
    new YouTubeConnectService(
      {
        checkChannel: check,
        hasGoogleClient: () => true,
        clientCredentialsAccepted: jest.fn().mockResolvedValue(clientAccepted),
      } as unknown as YouTubeApiClient,
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

  it('blames our Google client, not the person, when Google refuses the client secret', async () => {
    const check = jest.fn().mockRejectedValue(new Error('invalid_client'));
    const result = await make(
      { refreshToken: 'r', channelTitle: 'My channel' },
      check,
      false,
    ).check('w1');
    expect(result).toEqual(expect.objectContaining({ connected: true, working: false }));
    expect(result.problem).toContain('not set up correctly on our side');
    expect(result.problem).not.toContain('invalid_client');
  });

  it('never shows the error text Google sent', async () => {
    const check = jest
      .fn()
      .mockRejectedValue(new Error('Request had insufficient authentication scopes. project 123'));
    const result = await make({ refreshToken: 'r' }, check).check('w1');
    expect(result.problem).not.toContain('project 123');
  });
});

describe('YouTubeConnectService.handleCallback', () => {
  const state = JSON.stringify({
    organizationId: 'o1',
    workspaceId: 'w1',
    userId: 'u1',
    iat: Date.now(),
    returnTo: 'youtube-posts',
  });
  const make = (connectChannel: jest.Mock) =>
    new YouTubeConnectService(
      { connectChannel } as unknown as YouTubeApiClient,
      { decrypt: () => state } as unknown as EncryptionService,
      { connect: jest.fn() } as unknown as IntegrationsService,
      { get: () => 'https://lumoraos.in' } as unknown as ConfigService,
    );
  const errorOf = (url: string) => new URL(url).searchParams.get('youtube_error') ?? '';

  it('says the problem is on our side when Google refuses the client (invalid_client)', async () => {
    const url = await make(jest.fn().mockRejectedValue(new Error('invalid_client'))).handleCallback(
      'c',
      's',
    );
    expect(url).toContain('#youtube-posts');
    expect(errorOf(url)).toContain('not set up correctly on our side');
    expect(errorOf(url)).not.toContain('invalid_client');
  });

  it('asks to press Connect again when the code expired (invalid_grant)', async () => {
    const url = await make(jest.fn().mockRejectedValue(new Error('invalid_grant'))).handleCallback(
      'c',
      's',
    );
    expect(errorOf(url)).toContain('Connect YouTube again');
  });

  it('keeps our own messages', async () => {
    const url = await make(jest.fn()).handleCallback(undefined, 's');
    expect(errorOf(url)).toBe('Missing code or state from Google');
  });
});
