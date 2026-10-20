import { Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * Shared HTTP plumbing for AI provider adapters. Every provider speaks plain
 * REST/JSON to its vendor's API using the platform's built-in `fetch`, so no
 * heavyweight/fast-moving vendor SDK is a dependency of this codebase.
 *
 * Vendor errors are logged for us and turned into plain messages: the vendor's
 * own reply (billing state, quotas, request ids) never reaches a customer.
 */
export abstract class BaseAIProvider {
  private readonly httpLogger = new Logger(this.constructor.name);

  protected async postJson<T>(
    url: string,
    body: unknown,
    headers: Record<string, string>,
    /** Give up after this long, so a slow vendor fails cleanly (and the caller refunds) before the reverse proxy's own timeout turns it into an opaque 504. */
    timeoutMs?: number,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
      });
    } catch (error) {
      if ((error as Error).name === 'TimeoutError') {
        this.httpLogger.warn(`No answer within ${timeoutMs ?? 0} ms`);
        throw new ServiceUnavailableException(
          `The AI took longer than ${Math.round((timeoutMs ?? 0) / 1000)} seconds to answer. Please try again.`,
        );
      }
      this.httpLogger.error(`Could not reach the vendor: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'The AI could not be reached just now. Please try again in a minute.',
      );
    }

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 500);
      this.httpLogger.error(`Request failed (${response.status}): ${detail}`);
      throw new ServiceUnavailableException(vendorFailureMessage(response.status));
    }

    return response.json() as Promise<T>;
  }

  protected assertConfigured(apiKey: string, providerLabel: string): void {
    if (!apiKey) {
      throw new ServiceUnavailableException(
        `${providerLabel} is not configured. Set the corresponding API key in the environment.`,
      );
    }
  }
}

/** What a customer reads when the AI vendor refuses a request. Billing and key problems (402, 401, 403) are ours to fix,
 * so they read as "on our side"; the server log has the vendor's own words. */
export function vendorFailureMessage(status: number): string {
  if (status === 429) {
    return 'The AI is busy right now. Please try again in a few minutes.';
  }
  return 'The AI is temporarily unavailable on our side. Please try again later.';
}
