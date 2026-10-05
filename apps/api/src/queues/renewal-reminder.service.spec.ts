import {
  Subscription,
  SubscriptionStatus,
} from '@modules/billing/domain/entities/subscription.entity';
import {
  RenewalReminderService,
  reminderStageFor,
  shouldSendReminder,
} from './renewal-reminder.service';

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-10-10T10:00:00Z');
const inHours = (h: number) => new Date(now.getTime() + h * HOUR);

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub-1',
    organizationId: 'org-1',
    plan: 'starter',
    status: SubscriptionStatus.ACTIVE,
    gatewayProvider: 'razorpay',
    gatewayCustomerId: null,
    gatewaySubscriptionId: null,
    currentPeriodEnd: inHours(60),
    renewalReminderPeriodEnd: null,
    renewalReminderStage: 0,
    ...overrides,
  } as Subscription;
}

describe('reminderStageFor', () => {
  it('is 3 within 72 hours, 1 within 24 hours, otherwise none', () => {
    expect(reminderStageFor(inHours(100), now)).toBeNull();
    expect(reminderStageFor(inHours(72), now)).toBe(3);
    expect(reminderStageFor(inHours(30), now)).toBe(3);
    expect(reminderStageFor(inHours(24), now)).toBe(1);
    expect(reminderStageFor(inHours(2), now)).toBe(1);
  });

  it('gives nothing once the period has ended (the expiry notice covers it)', () => {
    expect(reminderStageFor(inHours(0), now)).toBeNull();
    expect(reminderStageFor(inHours(-5), now)).toBeNull();
  });
});

describe('shouldSendReminder', () => {
  it('sends when nothing was sent for this period', () => {
    expect(shouldSendReminder(subscription(), 3)).toBe(true);
  });

  it('does not repeat the same reminder, but does send the later one', () => {
    const end = inHours(20);
    const sent3 = subscription({
      currentPeriodEnd: end,
      renewalReminderPeriodEnd: end,
      renewalReminderStage: 3,
    });
    expect(shouldSendReminder(sent3, 3)).toBe(false);
    expect(shouldSendReminder(sent3, 1)).toBe(true);

    const sent1 = subscription({
      currentPeriodEnd: end,
      renewalReminderPeriodEnd: end,
      renewalReminderStage: 1,
    });
    expect(shouldSendReminder(sent1, 1)).toBe(false);
  });

  it('starts over after the customer renews (new period end)', () => {
    const old = inHours(-1);
    const renewed = subscription({
      currentPeriodEnd: inHours(70),
      renewalReminderPeriodEnd: old,
      renewalReminderStage: 1,
    });
    expect(shouldSendReminder(renewed, 3)).toBe(true);
  });
});

describe('RenewalReminderService', () => {
  const build = () => {
    const mailer = { send: jest.fn().mockResolvedValue(undefined) };
    const subscriptions = { markRenewalReminderSent: jest.fn().mockResolvedValue(undefined) };
    const service = new RenewalReminderService(
      mailer,
      { get: () => 'https://lumoraos.in' } as never,
      subscriptions as never,
      { findById: jest.fn().mockResolvedValue({ ownerId: 'u1' }) } as never,
      { findEntityById: jest.fn().mockResolvedValue({ email: 'owner@example.com' }) } as never,
    );
    return { service, mailer, subscriptions };
  };

  it('emails the owner and records the reminder', async () => {
    const { service, mailer, subscriptions } = build();
    const sub = subscription();

    await expect(service.remindIfDue(sub, now)).resolves.toBe(true);

    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@example.com',
        subject: expect.stringContaining('ends in 3 days'),
      }),
    );
    expect(subscriptions.markRenewalReminderSent).toHaveBeenCalledWith(
      'sub-1',
      sub.currentPeriodEnd,
      3,
    );
    // Plan prices are stored in paise; the email must show rupees (Starter = 4,000).
    expect(mailer.send.mock.calls[0][0].html).toContain('₹4,000');
  });

  it('does not email an enterprise (invoice-billed) plan or a plan that is far from ending', async () => {
    const { service, mailer } = build();
    await expect(service.remindIfDue(subscription({ plan: 'enterprise' }), now)).resolves.toBe(
      false,
    );
    await expect(
      service.remindIfDue(subscription({ currentPeriodEnd: inHours(200) }), now),
    ).resolves.toBe(false);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('does not mark the reminder as sent when the email fails, so it is retried', async () => {
    const { service, mailer, subscriptions } = build();
    mailer.send.mockRejectedValue(new Error('smtp down'));

    await expect(service.remindIfDue(subscription(), now)).resolves.toBe(false);
    expect(subscriptions.markRenewalReminderSent).not.toHaveBeenCalled();
  });
});
