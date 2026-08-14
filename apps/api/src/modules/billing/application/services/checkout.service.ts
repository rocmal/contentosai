import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkspacesService } from '@modules/workspaces/application/services/workspaces.service';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { PLAN_PRICING_INR, PurchasablePlan, isPurchasablePlan } from '../../billing.constants';
import { PaymentProviderFactory } from '../../infrastructure/payment-provider.factory';
import { PaymentOrder } from '../../domain/interfaces/payment-provider.interface';
import { SubscriptionStatus } from '../../domain/entities/subscription.entity';
import {
  ISubscriptionsRepository,
  SUBSCRIPTIONS_REPOSITORY,
} from '../../domain/repositories/subscription-repository.interface';

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

/** Drives self-serve plan checkout: creates the Razorpay order the frontend
 * opens Checkout with, and (from the webhook) activates the subscription and
 * grants that period's credits once payment actually clears. Orders-based,
 * monthly-only - see billing.constants.ts for why. */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    @Inject(SUBSCRIPTIONS_REPOSITORY)
    private readonly subscriptionsRepository: ISubscriptionsRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly creditsService: CreditsService,
    private readonly paymentProviderFactory: PaymentProviderFactory,
    private readonly configService: ConfigService,
  ) {}

  async createOrder(
    organizationId: string,
    plan: PurchasablePlan,
  ): Promise<{ order: PaymentOrder; keyId: string }> {
    const provider = this.paymentProviderFactory.getProvider();
    const order = await provider.createOrder({
      amount: PLAN_PRICING_INR[plan],
      currency: 'INR',
      receipt: `sub_${organizationId}_${Date.now()}`,
      notes: { organizationId, plan },
    });

    return { order, keyId: this.configService.get<string>('razorpay.keyId') ?? '' };
  }

  /** Called from the Razorpay webhook on payment.captured. Idempotent: a
   * gateway payment id only ever activates a subscription once, so Razorpay's
   * at-least-once webhook redelivery can't double-grant credits. */
  async activateFromPayment(params: {
    organizationId: string;
    plan: string;
    gatewayPaymentId: string;
  }): Promise<void> {
    if (!isPurchasablePlan(params.plan)) {
      this.logger.warn(`Ignoring checkout webhook for non-purchasable plan "${params.plan}"`);
      return;
    }

    const existing = await this.subscriptionsRepository.findByOrganization(params.organizationId);
    if (existing?.gatewaySubscriptionId === params.gatewayPaymentId) {
      this.logger.log(`Payment ${params.gatewayPaymentId} already activated - skipping duplicate webhook delivery`);
      return;
    }

    const now = new Date();
    const currentPeriodEnd = addOneMonth(now);

    if (existing) {
      await this.subscriptionsRepository.update(existing.id, {
        plan: params.plan,
        status: SubscriptionStatus.ACTIVE,
        gatewayProvider: 'razorpay',
        gatewaySubscriptionId: params.gatewayPaymentId,
        currentPeriodEnd,
      });
    } else {
      await this.subscriptionsRepository.create({
        organizationId: params.organizationId,
        plan: params.plan,
        status: SubscriptionStatus.ACTIVE,
        gatewayProvider: 'razorpay',
        gatewaySubscriptionId: params.gatewayPaymentId,
        currentPeriodEnd,
      });
    }

    const workspaces = await this.workspacesService.findByOrganization(params.organizationId);
    for (const workspace of workspaces) {
      await this.creditsService.grantMonthlyRenewal(
        params.organizationId,
        workspace.id,
        params.plan,
        now,
        currentPeriodEnd,
      );
    }

    this.logger.log(`Activated "${params.plan}" for organization ${params.organizationId} via ${params.gatewayPaymentId}`);
  }
}
