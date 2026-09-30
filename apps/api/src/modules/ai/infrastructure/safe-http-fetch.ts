import * as dns from 'dns';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import { BadRequestException } from '@nestjs/common';

/** True for loopback, private, link-local, carrier-grade NAT, multicast and
 * other non-public addresses that a user-supplied URL must never reach. */
export function isPrivateAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      lower === '::' ||
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb') ||
      lower.startsWith('ff')
    );
  }
  return true;
}

export interface FetchedPage {
  finalUrl: string;
  html: string;
}

interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

/** Fetches a public web page on behalf of a user-supplied URL without letting
 * it reach internal services (SSRF): only http(s) on the default ports, the
 * hostname is resolved once, every resolved address must be public, and the
 * connection is pinned to that address (no DNS-rebinding window). Redirects
 * are followed manually so each hop is re-validated. The body is capped. */
export async function fetchPublicHtml(rawUrl: string, options: FetchOptions = {}): Promise<FetchedPage> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxBytes = options.maxBytes ?? 1_500_000;
  const maxRedirects = options.maxRedirects ?? 3;

  let current = normaliseUrl(rawUrl);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const result = await requestOnce(current, timeoutMs, maxBytes);
    if (result.redirectTo) {
      current = normaliseUrl(new URL(result.redirectTo, current).toString());
      continue;
    }
    return { finalUrl: current.toString(), html: result.body };
  }
  throw new BadRequestException('The website redirected too many times.');
}

function normaliseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new BadRequestException('That does not look like a valid website address.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('Only http and https website addresses are supported.');
  }
  if (url.username || url.password) {
    throw new BadRequestException('Website addresses with credentials are not allowed.');
  }
  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
  if (port !== 80 && port !== 443) {
    throw new BadRequestException('Only the standard web ports (80 and 443) are supported.');
  }
  return url;
}

async function resolvePublicAddress(hostname: string): Promise<string> {
  const bare = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(bare)) {
    if (isPrivateAddress(bare)) throw new BadRequestException('That website address is not allowed.');
    return bare;
  }
  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(bare, { all: true });
  } catch {
    throw new BadRequestException('Could not find that website. Check the address and try again.');
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new BadRequestException('That website address is not allowed.');
  }
  return addresses[0].address;
}

async function requestOnce(
  url: URL,
  timeoutMs: number,
  maxBytes: number,
): Promise<{ body: string; redirectTo?: string }> {
  const address = await resolvePublicAddress(url.hostname);
  const isHttps = url.protocol === 'https:';
  const transport = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        host: address,
        port: url.port ? Number(url.port) : isHttps ? 443 : 80,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        servername: isHttps ? url.hostname : undefined,
        headers: {
          Host: url.host,
          'User-Agent': 'LumoraBrandBot/1.0 (+brand profile import)',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: timeoutMs,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
          res.resume();
          resolve({ body: '', redirectTo: res.headers.location });
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          reject(new BadRequestException(`The website responded with an error (${status}).`));
          return;
        }
        const contentType = String(res.headers['content-type'] ?? '');
        if (!/text\/html|application\/xhtml/i.test(contentType)) {
          res.resume();
          reject(new BadRequestException('That address does not return a web page.'));
          return;
        }

        const chunks: Buffer[] = [];
        let received = 0;
        res.on('data', (chunk: Buffer) => {
          received += chunk.length;
          if (received > maxBytes) {
            // Enough of the page to read its head and main copy.
            res.destroy();
            resolve({ body: Buffer.concat(chunks).toString('utf8') });
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve({ body: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', () => resolve({ body: Buffer.concat(chunks).toString('utf8') }));
      },
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new BadRequestException('The website took too long to respond.'));
    });
    req.on('error', () => reject(new BadRequestException('Could not reach that website.')));
    req.end();
  });
}
