import { ConfigService } from '@nestjs/config';
import { WorkspacesService } from '@modules/workspaces/application/services/workspaces.service';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { Subscription, SubscriptionStatus } from '../../domain/entities/subscription.entity';
import { ISubscriptionsRepository } from '../../domain/repositories/subscription-repository.interface';
import { PaymentProviderFactory } from '../../infrastructure/payment-provider.factory';
import { CheckoutService } from './checkout.service';

const DAY = 86_400_000;

const subscription = (overrides: Partial<Subscription> = {}): Subscription =>
  ({
    id: 'sub-1',
    organizationId: 'org-1',
    plan: 'starter',
    status: SubscriptionStatus.TRIALING,
    gatewayProvider: null,
    gatewayCustomerId: null,
    gatewaySubscriptionId: null,
    currentPeriodEnd: null,
    renewalReminderPeriodEnd: null,
    renewalReminderStage: 0,
    prepaidPeriods: 0,
    ...overrides,
  }) as Subscription;

describe('CheckoutService', () => {
  let service: CheckoutService;
  let subscriptionsRepository: jest.Mocked<ISubscriptionsRepository>;
  let creditsService: jest.Mocked<CreditsService>;

  beforeEach(() => {
    subscriptionsRepository = {
      findByOrganization: jest.fn().mockResolvedValue(subscription()),
      update: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<ISubscriptionsRepository>;
    creditsService = {
      grantMonthlyRenewal: jest.fn(),
    } as unknown as jest.Mocked<CreditsService>;
    service = new CheckoutService(
      subscriptionsRepository,
      {
        findByOrganization: jest.fn().mockResolvedValue([{ id: 'ws-1' }]),
      } as unknown as WorkspacesService,
      creditsService,
      {} as PaymentProviderFactory,
      {} as ConfigService,
    );
  });

  describe('grantPeriods (a platform admin giving months)', () => {
    it('starts a trial customer today with fresh credits and queues the other months', async () => {
      const before = Date.now();
      const result = await service.grantPeriods({
        organizationId: 'org-1',
        plan: 'pro',
        periods: 3,
        reference: 'admin:1',
      });

      expect(result.extended).toBe(false);
      expect(result.prepaidPeriods).toBe(2);
      expect(result.currentPeriodEnd.getTime()).toBeGreaterThanOrEqual(before + 30 * DAY);
      expect(subscriptionsRepository.update).toHaveBeenCalledWith('sub-1', {
        plan: 'pro',
        status: SubscriptionStatus.ACTIVE,
        gatewayProvider: 'admin',
        gatewaySubscriptionId: 'admin:1',
        currentPeriodEnd: result.currentPeriodEnd,
        prepaidPeriods: 2,
      });
      expect(creditsService.grantMonthlyRenewal).toHaveBeenCalledWith(
        'org-1',
        'ws-1',
        'pro',
        expect.any(Date),
        result.currentPeriodEnd,
      );
    });

    it('extends the same plan still running without touching its credits', async () => {
      const end = new Date(Date.now() + 10 * DAY);
      subscriptionsRepository.findByOrganization.mockResolvedValue(
        subscription({
          plan: 'starter',
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: end,
          prepaidPeriods: 1,
        }),
      );

      const result = await service.grantPeriods({
        organizationId: 'org-1',
        plan: 'starter',
        periods: 6,
        reference: 'admin:2',
      });

      expect(result).toEqual({ currentPeriodEnd: end, prepaidPeriods: 7, extended: true });
      expect(subscriptionsRepository.update).toHaveBeenCalledWith('sub-1', { prepaidPeriods: 7 });
      expect(creditsService.grantMonthlyRenewal).not.toHaveBeenCalled();
    });

    it('starts again today when switching to another plan', async () => {
      subscriptionsRepository.findByOrganization.mockResolvedValue(
        subscription({
          plan: 'starter',
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date(Date.now() + 10 * DAY),
          prepaidPeriods: 4,
        }),
      );

      const result = await service.grantPeriods({
        organizationId: 'org-1',
        plan: 'pro',
        periods: 1,
        reference: 'admin:3',
      });

      expect(result.extended).toBe(false);
      expect(result.prepaidPeriods).toBe(0);
      expect(creditsService.grantMonthlyRenewal).toHaveBeenCalledTimes(1);
    });
  });

  it('a payment leaves the months an admin gave alone', async () => {
    await service.startPaidPeriod({
      organizationId: 'org-1',
      plan: 'starter',
      gatewayProvider: 'razorpay',
      reference: 'pay_1',
    });
    expect(subscriptionsRepository.update).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({ prepaidPeriods: undefined }),
    );
  });
});
