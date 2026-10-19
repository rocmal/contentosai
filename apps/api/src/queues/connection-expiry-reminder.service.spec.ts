import { IntegrationsService } from '@modules/integrations/application/services/integrations.service';
import { NotificationsService } from '@modules/notifications/application/services/notifications.service';
import {
  ConnectionExpiryReminderService,
  connectionReminderFor,
} from './connection-expiry-reminder.service';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date(Date.UTC(2026, 9, 19, 3, 30));
const at = (ms: number) => new Date(now.getTime() + ms);

describe('connectionReminderFor', () => {
  it('reminds a week before, the day before and on the day', () => {
    expect(connectionReminderFor(at(6.5 * DAY), now)).toBe('week');
    expect(connectionReminderFor(at(12 * 60 * 60 * 1000), now)).toBe('day');
    expect(connectionReminderFor(at(-60_000), now)).toBe('expired');
  });

  it('stays quiet the rest of the time', () => {
    expect(connectionReminderFor(at(30 * DAY), now)).toBeNull();
    expect(connectionReminderFor(at(3 * DAY), now)).toBeNull();
    expect(connectionReminderFor(at(-2 * DAY), now)).toBeNull();
  });
});

describe('ConnectionExpiryReminderService', () => {
  it('tells the person who connected LinkedIn, with the date, and skips connections that are fine', async () => {
    const integrations = {
      listLinkedInExpiries: jest.fn().mockResolvedValue([
        { workspaceId: 'w1', userId: 'u1', memberName: 'Puneet', expiresAt: at(6.5 * DAY) },
        { workspaceId: 'w2', userId: 'u2', memberName: null, expiresAt: at(40 * DAY) },
        { workspaceId: 'w3', userId: null, memberName: null, expiresAt: at(6.5 * DAY) },
      ]),
    } as unknown as IntegrationsService;
    const notifications = {
      create: jest.fn().mockResolvedValue({}),
    } as unknown as NotificationsService;

    const sent = await new ConnectionExpiryReminderService(integrations, notifications).run(now);

    expect(sent).toBe(1);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        title: 'Reconnect LinkedIn soon',
        message: expect.stringContaining('(Puneet) runs out on 25 Oct 2026'),
        metadata: { link: 'integrations' },
      }),
    );
  });
});
