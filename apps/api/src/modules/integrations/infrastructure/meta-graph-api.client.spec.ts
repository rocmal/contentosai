import { ConfigService } from '@nestjs/config';
import { MetaGraphApiClient } from './meta-graph-api.client';

const config = (values: Record<string, unknown>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const base = {
  'meta.appId': 'app-1',
  'meta.appSecret': 'secret',
  'meta.redirectUri': 'https://lumoraos.in/api/v1/integrations/meta/callback',
};

const scopesIn = (url: string) => new URL(url).searchParams.get('scope')?.split(',') ?? [];

describe('MetaGraphApiClient', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('asks only for the Facebook Page permissions when Instagram is turned off', () => {
    const client = new MetaGraphApiClient(config({ ...base, 'meta.instagramEnabled': false }));
    expect(scopesIn(client.getLoginDialogUrl('state-1'))).toEqual([
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'business_management',
    ]);
  });

  it('asks for the Instagram permissions too by default', () => {
    const client = new MetaGraphApiClient(config(base));
    expect(scopesIn(client.getLoginDialogUrl('state-1'))).toEqual(
      expect.arrayContaining(['instagram_basic', 'instagram_content_publish']),
    );
  });

  it('reads the linked Instagram account only when Instagram is on', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });

    await new MetaGraphApiClient(
      config({ ...base, 'meta.instagramEnabled': false }),
    ).listConnectedPages('token');
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('fields')).toBe(
      'id,name,access_token',
    );

    fetchMock.mockClear();
    await new MetaGraphApiClient(config(base)).listConnectedPages('token');
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('fields')).toContain(
      'instagram_business_account',
    );
  });
});
