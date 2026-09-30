import { BadRequestException } from '@nestjs/common';
import { fetchPublicHtml, isPrivateAddress } from './safe-http-fetch';
import { extractPageSignals } from '../application/content-studio/html-signals';

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    '::',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.5',
  ])('treats %s as non-public', (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700:4700::1111'])('treats %s as public', (address) => {
    expect(isPrivateAddress(address)).toBe(false);
  });
});

describe('fetchPublicHtml address validation', () => {
  it.each([
    'http://127.0.0.1/admin',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/',
    'http://10.0.0.1/',
    'http://localhost/',
  ])('refuses %s without connecting', async (url) => {
    await expect(fetchPublicHtml(url)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses non-http schemes, credentials and unusual ports', async () => {
    await expect(fetchPublicHtml('ftp://example.com/')).rejects.toBeInstanceOf(BadRequestException);
    await expect(fetchPublicHtml('https://user:pass@example.com/')).rejects.toBeInstanceOf(BadRequestException);
    await expect(fetchPublicHtml('https://example.com:8080/')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('extractPageSignals', () => {
  const html = `<html><head>
    <title>Acme &amp; Sons | Home</title>
    <meta name="description" content="We build great things.">
    <meta property="og:site_name" content="Acme">
    <meta name="theme-color" content="#0B4DA2">
    <style>body{color:red}</style><script>var secret = 1;</script></head>
    <body><nav>Menu Home About</nav><h1>Welcome to Acme</h1><p>We help families plan ahead.</p>
    <footer>Copyright</footer></body></html>`;

  it('reads head metadata and visible copy, dropping scripts, styles and page chrome', () => {
    const s = extractPageSignals(html);
    expect(s.title).toBe('Acme & Sons | Home');
    expect(s.description).toBe('We build great things.');
    expect(s.siteName).toBe('Acme');
    expect(s.themeColor).toBe('#0B4DA2');
    expect(s.text).toContain('Welcome to Acme');
    expect(s.text).toContain('We help families plan ahead.');
    expect(s.text).not.toContain('secret');
    expect(s.text).not.toContain('Menu Home');
    expect(s.text).not.toContain('color:red');
  });

  it('ignores a theme-color that is not a hex value', () => {
    expect(extractPageSignals('<meta name="theme-color" content="red">').themeColor).toBe('');
  });
});
