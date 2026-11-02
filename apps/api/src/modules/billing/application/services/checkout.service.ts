import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkspacesService } from '@modules/workspaces/application/services/workspaces.service';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { addBillingPeriod } from '@modules/credits/credits.constants';
import { PLAN_PRICING_INR, PurchasablePlan, isPurchasablePlan } from '../../billing.constants';
import { PaymentProviderFactory } from '../../infrastructure/payment-provider.factory';
import { PaymentOrder } from '../../domain/interfaces/payment-provider.interface';
import { Subscription, SubscriptionStatus } from '../../domain/entities/subscription.entity';
import {
  ISubscriptionsRepository,
  SUBSCRIPTIONS_REPOSITORY,
} from '../../domain/repositories/subscription-repository.interface';

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
      this.logger.log(
        `Payment ${params.gatewayPaymentId} already activated - skipping duplicate webhook delivery`,
      );
      return;
    }

    await this.startPaidPeriod({
      organizationId: params.organizationId,
      plan: params.plan,
      gatewayProvider: 'razorpay',
      reference: params.gatewayPaymentId,
    });
  }

  /** One paid 30-day period: the plan is active, the period ends 30 days after today (or after the days still paid
   * for) and every workspace starts again with the plan's credits. */
  async startPaidPeriod(params: {
    organizationId: string;
    plan: PurchasablePlan;
    gatewayProvider: string;
    reference: string;
  }): Promise<{ currentPeriodEnd: Date }> {
    const existing = await this.subscriptionsRepository.findByOrganization(params.organizationId);
    const now = new Date();
    // Renewing early keeps the days already paid for: the new 30 days start when
    // the current period ends, not today.
    const stillPaidUntil =
      existing?.status === SubscriptionStatus.ACTIVE &&
      existing.currentPeriodEnd &&
      existing.currentPeriodEnd > now
        ? existing.currentPeriodEnd
        : now;
    const currentPeriodEnd = addBillingPeriod(stillPaidUntil);

    await this.activate({ ...params, existing, now, currentPeriodEnd });
    return { currentPeriodEnd };
  }

  /**
   * A platform admin giving `periods` 30-day periods of a plan without a payment (AdminService), until the payment
   * gateway is live. The same plan still running is extended: the periods go after the ones it already has and its
   * credits are left alone. Anything else (the trial, a lapsed plan, another plan) starts again today with the plan's
   * credits. Either way the renewal job starts each further period with fresh credits (no carry-over) and the plan
   * lapses only after the last one.
   */
  async grantPeriods(params: {
    organizationId: string;
    plan: PurchasablePlan;
    periods: number;
    reference: string;
  }): Promise<{ currentPeriodEnd: Date; prepaidPeriods: number; extended: boolean }> {
    const existing = await this.subscriptionsRepository.findByOrganization(params.organizationId);
    const now = new Date();

    if (
      existing &&
      existing.status === SubscriptionStatus.ACTIVE &&
      existing.plan === params.plan &&
      existing.currentPeriodEnd &&
      existing.currentPeriodEnd > now
    ) {
      const prepaidPeriods = existing.prepaidPeriods + params.periods;
      await this.subscriptionsRepository.update(existing.id, { prepaidPeriods });
      return { currentPeriodEnd: existing.currentPeriodEnd, prepaidPeriods, extended: true };
    }

    const currentPeriodEnd = addBillingPeriod(now);
    const prepaidPeriods = params.periods - 1;
    await this.activate({
      organizationId: params.organizationId,
      plan: params.plan,
      gatewayProvider: 'admin',
      reference: params.reference,
      existing,
      now,
      currentPeriodEnd,
      prepaidPeriods,
    });
    return { currentPeriodEnd, prepaidPeriods, extended: false };
  }

  /** Makes the plan active until `currentPeriodEnd` and gives every workspace the plan's credits for that period. */
  private async activate(params: {
    organizationId: string;
    plan: PurchasablePlan;
    gatewayProvider: string;
    reference: string;
    existing: Subscription | null;
    now: Date;
    currentPeriodEnd: Date;
    /** Left as it is when omitted (a payment does not touch periods an admin gave). */
    prepaidPeriods?: number;
  }): Promise<void> {
    const { existing, currentPeriodEnd } = params;
    if (existing) {
      await this.subscriptionsRepository.update(existing.id, {
        plan: params.plan,
        status: SubscriptionStatus.ACTIVE,
        gatewayProvider: params.gatewayProvider,
        gatewaySubscriptionId: params.reference,
        currentPeriodEnd,
        prepaidPeriods: params.prepaidPeriods,
      });
    } else {
      await this.subscriptionsRepository.create({
        organizationId: params.organizationId,
        plan: params.plan,
        status: SubscriptionStatus.ACTIVE,
        gatewayProvider: params.gatewayProvider,
        gatewaySubscriptionId: params.reference,
        currentPeriodEnd,
        prepaidPeriods: params.prepaidPeriods ?? 0,
      });
    }

    const workspaces = await this.workspacesService.findByOrganization(params.organizationId);
    for (const workspace of workspaces) {
      await this.creditsService.grantMonthlyRenewal(
        params.organizationId,
        workspace.id,
        params.plan,
        params.now,
        currentPeriodEnd,
      );
    }

    this.logger.log(
      `Activated "${params.plan}" for organization ${params.organizationId} via ${params.reference}`,
    );
  }
}
