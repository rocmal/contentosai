import { Injectable, Logger } from '@nestjs/common';
import { IntegrationsService } from '@modules/integrations/application/services/integrations.service';
import { NotificationsService } from '@modules/notifications/application/services/notifications.service';
import { NotificationType } from '@modules/notifications/domain/entities/notification.entity';
import { formatIndiaDate } from '@shared/utils/india-time.util';

const DAY_MS = 24 * 60 * 60 * 1000;

export type ConnectionReminder = 'week' | 'day' | 'expired';

/**
 * Which reminder is due for a connection that stops working at `expiresAt`: "week" when 6-7 days are left, "day" in
 * the last 24 hours, "expired" in the 24 hours after. Each window is a day wide and the check runs once a day, so
 * every reminder goes out once without keeping a record of it.
 */
export function connectionReminderFor(expiresAt: Date, now: Date): ConnectionReminder | null {
  const msLeft = expiresAt.getTime() - now.getTime();
  if (msLeft > 6 * DAY_MS && msLeft <= 7 * DAY_MS) return 'week';
  if (msLeft > 0 && msLeft <= DAY_MS) return 'day';
  if (msLeft <= 0 && msLeft > -DAY_MS) return 'expired';
  return null;
}

/**
 * LinkedIn sign-ins last 60 days and cannot renew themselves, so scheduled posts would start failing without warning.
 * Runs daily (SocialPublishScheduler) and tells the person who connected the profile a week before, the day before,
 * and on the day it runs out.
 */
@Injectable()
export class ConnectionExpiryReminderService {
  private readonly logger = new Logger(ConnectionExpiryReminderService.name);

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async run(now: Date = new Date()): Promise<number> {
    let sent = 0;
    for (const connection of await this.integrationsService.listLinkedInExpiries()) {
      const reminder = connectionReminderFor(connection.expiresAt, now);
      if (!reminder || !connection.userId) continue;
      const date = formatIndiaDate(connection.expiresAt);
      const who = connection.memberName ? ` (${connection.memberName})` : '';
      try {
        await this.notificationsService.create({
          userId: connection.userId,
          title: reminder === 'expired' ? 'LinkedIn is disconnected' : 'Reconnect LinkedIn soon',
          message:
            reminder === 'expired'
              ? `Your LinkedIn connection${who} ran out on ${date}. Reconnect it in Integrations so your posts go out again.`
              : `Your LinkedIn connection${who} runs out on ${date}. Reconnect it in Integrations so scheduled posts keep going out.`,
          type: reminder === 'expired' ? NotificationType.ERROR : NotificationType.WARNING,
          metadata: { link: 'integrations' },
        });
        sent += 1;
      } catch (error) {
        this.logger.warn(
          `Could not send the LinkedIn expiry reminder: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return sent;
  }
}
