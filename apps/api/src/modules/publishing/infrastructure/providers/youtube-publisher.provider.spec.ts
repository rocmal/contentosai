import { ConfigService } from '@nestjs/config';
import { YouTubePublisherProvider, youtubeFailureMessage } from './youtube-publisher.provider';

const insert = jest.fn();
jest.mock('@googleapis/youtube', () => ({
  auth: {
    OAuth2: jest.fn().mockImplementation(() => ({ setCredentials: jest.fn() })),
  },
  youtube: jest.fn(() => ({ videos: { insert } })),
}));

describe('YouTubePublisherProvider', () => {
  const credentials = { channelId: 'UC1', refreshToken: 'refresh' };
  const publisher = new YouTubePublisherProvider({ get: () => 'x' } as unknown as ConfigService);

  beforeEach(() => {
    insert.mockReset();
    insert.mockResolvedValue({ data: { id: 'vid123' } });
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
      ) as unknown as typeof fetch;
  });

  it('uploads with a clean title, the description, the visibility and the disclosures', async () => {
    const result = await publisher.publish({
      videoUrl: 'https://lumoraos.in/storage/v.mp4',
      caption: 'Term plans <explained>',
      title: '  Term   plan <basics>  ',
      visibility: 'unlisted',
      aiGenerated: true,
      credentials,
    });

    expect(result).toEqual({
      externalPostId: 'vid123',
      permalink: 'https://www.youtube.com/watch?v=vid123',
    });
    const { requestBody } = insert.mock.calls[0][0];
    expect(requestBody.snippet).toEqual({
      title: 'Term plan basics',
      description: 'Term plans explained',
    });
    expect(requestBody.status).toEqual({
      privacyStatus: 'unlisted',
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: true,
    });
  });

  it('defaults to public, keeps the title to 100 characters and the description to 5,000 bytes', async () => {
    await publisher.publish({
      videoUrl: 'https://lumoraos.in/storage/v.mp4',
      caption: 'बीमा '.repeat(2000),
      title: 'T'.repeat(150),
      credentials,
    });

    const { requestBody } = insert.mock.calls[0][0];
    expect(requestBody.status.privacyStatus).toBe('public');
    expect(requestBody.status.containsSyntheticMedia).toBe(false);
    expect(requestBody.snippet.title).toHaveLength(100);
    expect(Buffer.byteLength(requestBody.snippet.description, 'utf8')).toBeLessThanOrEqual(5000);
  });

  it('turns Google errors into something to act on', async () => {
    insert.mockRejectedValue(
      Object.assign(new Error('invalid_grant'), { response: { data: { error: 'invalid_grant' } } }),
    );
    await expect(
      publisher.publish({ videoUrl: 'https://x/v.mp4', caption: 'c', title: 't', credentials }),
    ).rejects.toThrow(
      'Your YouTube connection has expired or was removed. Reconnect YouTube, then post again.',
    );
  });

  it('needs a connected channel and a video', async () => {
    await expect(
      publisher.publish({ videoUrl: 'https://x/v.mp4', caption: 'c', credentials: {} }),
    ).rejects.toThrow('Connect a YouTube channel before posting to it.');
    await expect(publisher.publish({ caption: 'c', credentials })).rejects.toThrow(
      'A video is required to publish to YouTube',
    );
  });
});

describe('youtubeFailureMessage', () => {
  const apiError = (reason: string, message = 'Google says no') => ({
    response: { data: { error: { message, errors: [{ reason }] } } },
  });

  it('explains the daily limits and a missing channel', () => {
    expect(youtubeFailureMessage(apiError('quotaExceeded'))).toContain(
      "today's YouTube upload allowance",
    );
    expect(youtubeFailureMessage(apiError('uploadLimitExceeded'))).toContain(
      'upload limit for today',
    );
    expect(youtubeFailureMessage(apiError('youtubeSignupRequired'))).toContain(
      'has no YouTube channel',
    );
  });

  it("keeps Google's own words for anything else", () => {
    expect(youtubeFailureMessage(apiError('invalidTitle', 'The title is invalid.'))).toBe(
      'YouTube did not accept the video: The title is invalid.',
    );
  });
});
