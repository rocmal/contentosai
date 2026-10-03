import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Shared HTTP plumbing for AI provider adapters. Every provider speaks plain
 * REST/JSON to its vendor's API using the platform's built-in `fetch`, so no
 * heavyweight/fast-moving vendor SDK is a dependency of this codebase.
 */
export abstract class BaseAIProvider {
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
        throw new ServiceUnavailableException(
          `${this.constructor.name} took longer than ${Math.round((timeoutMs ?? 0) / 1000)} seconds to answer. Please try again, or pick a faster provider.`,
        );
      }
      throw new ServiceUnavailableException(
        `Failed to reach ${this.constructor.name}: ${(error as Error).message}`,
      );
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ServiceUnavailableException(
        `${this.constructor.name} request failed (${response.status}): ${errorBody}`,
      );
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
