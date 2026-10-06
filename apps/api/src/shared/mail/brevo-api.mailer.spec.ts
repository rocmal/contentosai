import { BrevoApiMailer, parseSender } from './brevo-api.mailer';

const config = (values: Record<string, string>) => ({ get: (key: string) => values[key] }) as never;

describe('parseSender', () => {
  it('reads a bare address and a "Name <address>" form', () => {
    expect(parseSender('no-reply@lumoraos.in')).toEqual({ email: 'no-reply@lumoraos.in' });
    expect(parseSender('Lumora <no-reply@lumoraos.in>')).toEqual({
      email: 'no-reply@lumoraos.in',
      name: 'Lumora',
    });
    expect(parseSender('"Lumora OS" <no-reply@lumoraos.in>')).toEqual({
      email: 'no-reply@lumoraos.in',
      name: 'Lumora OS',
    });
  });
});

describe('BrevoApiMailer', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  const mailer = () =>
    new BrevoApiMailer(
      config({ 'mail.brevoApiKey': 'key-1', 'mail.from': 'Lumora <no-reply@lumoraos.in>' }),
    );

  it('posts the message to Brevo over HTTPS with the API key', async () => {
    fetchMock.mockResolvedValue(new Response('{"messageId":"x"}', { status: 201 }));

    await mailer().send({ to: 'a@example.com', subject: 'Hi', html: '<p>Hello</p>' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.headers['api-key']).toBe('key-1');
    expect(JSON.parse(init.body)).toEqual({
      sender: { email: 'no-reply@lumoraos.in', name: 'Lumora' },
      to: [{ email: 'a@example.com' }],
      subject: 'Hi',
      htmlContent: '<p>Hello</p>',
    });
  });

  it('throws when Brevo rejects the email, so the queue retries it', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"code":"unauthorized","message":"Key not found"}', { status: 401 }),
    );

    await expect(mailer().send({ to: 'a@example.com', subject: 'Hi', html: 'x' })).rejects.toThrow(
      /401 unauthorized Key not found/,
    );
  });

  it('fails loudly (and does not call Brevo) when no API key is configured', async () => {
    await expect(
      new BrevoApiMailer(config({ 'mail.from': 'no-reply@lumoraos.in' })).send({
        to: 'a@example.com',
        subject: 'Hi',
        html: 'x',
      }),
    ).rejects.toThrow(/BREVO_API_KEY is not set/);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
