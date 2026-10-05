import { SubscriptionStatus } from '@modules/billing/domain/entities/subscription.entity';
import { CreditsRenewalProcessor } from './credits-renewal.processor';

const past = new Date(Date.now() - 60_000);
const future = new Date(Date.now() + 86_400_000);

function makeProcessor(subscriptions: unknown[]) {
  const subscriptionsService = {
    findAll: jest.fn().mockResolvedValue({ items: subscriptions, meta: { totalPages: 1 } }),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const workspacesService = { findByOrganization: jest.fn().mockResolvedValue([{ id: 'ws-1' }]) };
  const creditsService = {
    expire: jest.fn().mockResolvedValue(undefined),
    grantMonthlyRenewal: jest.fn().mockResolvedValue(undefined),
  };
  const renewalReminders = {
    remindIfDue: jest.fn().mockResolvedValue(false),
    notifyExpired: jest.fn().mockResolvedValue(undefined),
  };
  const processor = new CreditsRenewalProcessor(
    subscriptionsService as never,
    workspacesService as never,
    creditsService as never,
    renewalReminders as never,
  );
  return { processor, subscriptionsService, creditsService, renewalReminders };
}

describe('CreditsRenewalProcessor', () => {
  it('lapses an unpaid self-serve plan instead of granting free credits', async () => {
    const { processor, subscriptionsService, creditsService, renewalReminders } = makeProcessor([
      {
        id: 's1',
        organizationId: 'org-1',
        plan: 'pro',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: past,
      },
    ]);

    await processor.process({} as never);

    expect(creditsService.expire).toHaveBeenCalledWith('org-1', 'ws-1');
    expect(creditsService.grantMonthlyRenewal).not.toHaveBeenCalled();
    expect(subscriptionsService.update).toHaveBeenCalledWith('s1', {
      status: SubscriptionStatus.PAST_DUE,
    });
    expect(renewalReminders.notifyExpired).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1' }),
    );
  });

  it('keeps rolling invoice-billed (enterprise) plans', async () => {
    const { processor, subscriptionsService, creditsService } = makeProcessor([
      {
        id: 's2',
        organizationId: 'org-2',
        plan: 'enterprise',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: past,
      },
    ]);

    await processor.process({} as never);

    expect(creditsService.grantMonthlyRenewal).toHaveBeenCalledTimes(1);
    expect(creditsService.expire).not.toHaveBeenCalled();
    expect(subscriptionsService.update).toHaveBeenCalledWith(
      's2',
      expect.objectContaining({ currentPeriodEnd: expect.any(String) }),
    );
  });

  it('ignores plans that are still in period, trials and already-lapsed subscriptions', async () => {
    const { processor, subscriptionsService, creditsService } = makeProcessor([
      {
        id: 's3',
        organizationId: 'o',
        plan: 'pro',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: future,
      },
      {
        id: 's4',
        organizationId: 'o',
        plan: 'starter',
        status: SubscriptionStatus.TRIALING,
        currentPeriodEnd: null,
      },
      {
        id: 's5',
        organizationId: 'o',
        plan: 'pro',
        status: SubscriptionStatus.PAST_DUE,
        currentPeriodEnd: past,
      },
    ]);

    await processor.process({} as never);

    expect(creditsService.expire).not.toHaveBeenCalled();
    expect(subscriptionsService.update).not.toHaveBeenCalled();
  });
});
