import { ConfigService } from '@nestjs/config';
import {
  defaultLinkedInVersion,
  effectiveLinkedInVersion,
  LinkedInPublisherProvider,
} from './linkedin-publisher.provider';

/** A fetch Response stand-in with just what the publisher reads. */
function reply(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: (name: string) => init.headers?.[name.toLowerCase()] ?? null },
    json: () => Promise.resolve(body),
    arrayBuffer: () => Promise.resolve(body as ArrayBuffer),
  };
}

class TestPublisher extends LinkedInPublisherProvider {
  protected videoPollMs = 0;
}

describe('LinkedInPublisherProvider', () => {
  const credentials = {
    authorUrn: 'urn:li:person:abc',
    accessToken: 'token',
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  let fetchMock: jest.Mock;
  let publisher: TestPublisher;

  const calls = () =>
    fetchMock.mock.calls.map(([url, init]) => ({ url: String(url), init: init ?? {} }));
  const postBody = () =>
    JSON.parse(calls().find((c) => c.url.endsWith('/rest/posts'))!.init.body as string);

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    publisher = new TestPublisher({ get: () => '' } as unknown as ConfigService);
  });

  it('posts text on its own, escaped, with a current API version', async () => {
    fetchMock.mockResolvedValueOnce(
      reply({}, { status: 201, headers: { 'x-restli-id': 'urn:li:share:1' } }),
    );

    const result = await publisher.publish({
      caption: 'Plan today (not tomorrow) #LIC',
      credentials,
    });

    expect(result).toEqual({
      externalPostId: 'urn:li:share:1',
      permalink: 'https://www.linkedin.com/feed/update/urn:li:share:1',
    });
    expect(postBody()).toMatchObject({
      author: 'urn:li:person:abc',
      commentary: 'Plan today \\(not tomorrow\\) {hashtag|\\#|LIC}',
      lifecycleState: 'PUBLISHED',
    });
    expect(postBody().content).toBeUndefined();
    expect((calls()[0].init.headers as Record<string, string>)['LinkedIn-Version']).toBe(
      defaultLinkedInVersion(),
    );
  });

  it('uploads an image and attaches it', async () => {
    fetchMock
      .mockResolvedValueOnce(
        reply({ value: { uploadUrl: 'https://upload/img', image: 'urn:li:image:9' } }),
      )
      .mockResolvedValueOnce(reply(new ArrayBuffer(4)))
      .mockResolvedValueOnce(reply({}, { status: 201 }))
      .mockResolvedValueOnce(
        reply({}, { status: 201, headers: { 'x-restli-id': 'urn:li:share:2' } }),
      );

    await publisher.publish({
      caption: 'Diwali offer',
      imageUrl: 'https://lumoraos.in/storage/a.jpg',
      credentials,
    });

    expect(calls().map((c) => c.url)).toEqual([
      'https://api.linkedin.com/rest/images?action=initializeUpload',
      'https://lumoraos.in/storage/a.jpg',
      'https://upload/img',
      'https://api.linkedin.com/rest/posts',
    ]);
    expect(postBody().content).toEqual({ media: { id: 'urn:li:image:9' } });
  });

  it('uploads a video in the parts LinkedIn asks for, finalizes it and waits until it is processed', async () => {
    const video = new ArrayBuffer(10);
    fetchMock
      .mockResolvedValueOnce(reply(video))
      .mockResolvedValueOnce(
        reply({
          value: {
            video: 'urn:li:video:7',
            uploadToken: 'tok',
            uploadInstructions: [
              { uploadUrl: 'https://upload/p1', firstByte: 0, lastByte: 5 },
              { uploadUrl: 'https://upload/p2', firstByte: 6, lastByte: 9 },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(reply({}, { headers: { etag: 'e1' } }))
      .mockResolvedValueOnce(reply({}, { headers: { etag: 'e2' } }))
      .mockResolvedValueOnce(reply({}))
      .mockResolvedValueOnce(reply({ status: 'PROCESSING' }))
      .mockResolvedValueOnce(reply({ status: 'AVAILABLE' }))
      .mockResolvedValueOnce(
        reply({}, { status: 201, headers: { 'x-restli-id': 'urn:li:ugcPost:3' } }),
      );

    await publisher.publish({
      caption: 'Our new reel',
      videoUrl: 'https://lumoraos.in/storage/v.mp4',
      credentials,
    });

    const init = JSON.parse(calls()[1].init.body as string);
    expect(init.initializeUploadRequest).toMatchObject({
      owner: 'urn:li:person:abc',
      fileSizeBytes: 10,
    });
    expect((calls()[2].init.body as ArrayBuffer).byteLength).toBe(6);
    expect((calls()[3].init.body as ArrayBuffer).byteLength).toBe(4);
    expect(JSON.parse(calls()[4].init.body as string).finalizeUploadRequest).toEqual({
      video: 'urn:li:video:7',
      uploadToken: 'tok',
      uploadedPartIds: ['e1', 'e2'],
    });
    expect(calls()[5].url).toBe('https://api.linkedin.com/rest/videos/urn%3Ali%3Avideo%3A7');
    expect(postBody().content).toEqual({ media: { id: 'urn:li:video:7' } });
  });

  it('refuses to post with an expired connection, and says how to fix it', async () => {
    await expect(
      publisher.publish({
        caption: 'Hello',
        credentials: { ...credentials, expiresAt: Date.now() - 1000 },
      }),
    ).rejects.toThrow(/expired on .* Reconnect LinkedIn in Integrations/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports LinkedIn's own reason when a post is refused", async () => {
    fetchMock.mockResolvedValueOnce(reply({ message: 'Content is a duplicate' }, { status: 422 }));
    await expect(publisher.publish({ caption: 'Hello', credentials })).rejects.toThrow(
      'LinkedIn did not accept the post: Content is a duplicate',
    );
  });
});

describe('defaultLinkedInVersion', () => {
  it('is the month three months back, across a year boundary too', () => {
    expect(defaultLinkedInVersion(new Date(Date.UTC(2026, 9, 19)))).toBe('202607');
    expect(defaultLinkedInVersion(new Date(Date.UTC(2027, 1, 3)))).toBe('202611');
  });
});

describe('effectiveLinkedInVersion', () => {
  const october2026 = new Date(Date.UTC(2026, 9, 23));

  it('ignores a retired pin - the stale 202401 that broke every post in October 2026', () => {
    expect(effectiveLinkedInVersion('202401', october2026)).toBe('202607');
  });

  it('keeps a recent pin', () => {
    expect(effectiveLinkedInVersion('202605', october2026)).toBe('202605');
    expect(effectiveLinkedInVersion('202512', october2026)).toBe('202512');
  });

  it('ignores a pin from the future, a malformed one and an empty one', () => {
    expect(effectiveLinkedInVersion('202702', october2026)).toBe('202607');
    expect(effectiveLinkedInVersion('2026-05', october2026)).toBe('202607');
    expect(effectiveLinkedInVersion('', october2026)).toBe('202607');
  });

  it('sends the automatic version when the server pins a retired one', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(reply({}, { status: 201, headers: { 'x-restli-id': 'urn:li:share:1' } }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const pinnedStale = new LinkedInPublisherProvider({
      get: (key: string) => (key === 'linkedin.apiVersion' ? '202401' : ''),
    } as unknown as ConfigService);

    await pinnedStale
      .publish({
        caption: 'Hello',
        credentials: {
          authorUrn: 'urn:li:person:abc',
          accessToken: 'token',
          expiresAt: Date.now() + 86_400_000,
        },
      })
      .catch(() => undefined);

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['LinkedIn-Version']).toBe(defaultLinkedInVersion());
  });
});
