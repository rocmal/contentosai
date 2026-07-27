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
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
    } catch (error) {
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
