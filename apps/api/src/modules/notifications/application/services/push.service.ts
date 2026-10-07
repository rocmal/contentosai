import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IPushTokensRepository,
  PUSH_TOKENS_REPOSITORY,
} from '../../domain/repositories/push-token-repository.interface';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

/** Sends a phone notification through Expo's push service. Never throws: a failed push must not fail the action that caused it. */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(@Inject(PUSH_TOKENS_REPOSITORY) private readonly tokens: IPushTokensRepository) {}

  register(userId: string, token: string, platform: string): Promise<void> {
    return this.tokens.upsert(userId, token, platform);
  }

  unregister(userId: string, token: string): Promise<void> {
    return this.tokens.removeByToken(token, userId);
  }

  async sendToUser(
    userId: string,
    message: { title: string; body: string; data?: Record<string, unknown> },
  ): Promise<void> {
    try {
      const devices = await this.tokens.listByUser(userId);
      if (devices.length === 0) return;

      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(
          devices.map((d) => ({ to: d.token, sound: 'default', ...message })),
        ),
      });
      if (!res.ok) {
        this.logger.warn(`Expo push request failed with status ${res.status}`);
        return;
      }
      const { data } = (await res.json()) as { data?: ExpoTicket[] };
      // Tickets come back in request order; drop tokens the phone no longer accepts.
      await Promise.all(
        (data ?? []).map((ticket, i) =>
          ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
            ? this.tokens.removeByToken(devices[i].token)
            : undefined,
        ),
      );
    } catch (err) {
      this.logger.warn(`Push delivery failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
