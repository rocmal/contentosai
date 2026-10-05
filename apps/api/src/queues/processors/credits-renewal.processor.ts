import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SubscriptionsService } from '@modules/billing/application/services/subscriptions.service';
import { SubscriptionStatus } from '@modules/billing/domain/entities/subscription.entity';
import { isPurchasablePlan } from '@modules/billing/billing.constants';
import { WorkspacesService } from '@modules/workspaces/application/services/workspaces.service';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { QueueName } from '../queue-names';
import { RenewalReminderService } from '../renewal-reminder.service';

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

/** Runs on a schedule (registered as a BullMQ repeatable job, see
 * QueuesModule) and handles subscriptions whose period has ended.
 *
 * Self-serve plans (Starter/Pro) are paid by a one-off Razorpay order per
 * month - there is no recurring charge - so when the period ends without a
 * new payment the plan lapses: the subscription becomes PAST_DUE and the
 * remaining credits are removed until the customer renews. (Renewing through
 * checkout re-activates it and grants a fresh allotment.) Invoice-billed
 * plans (Enterprise) keep the old behaviour of rolling the period and
 * resetting credits, since they are paid outside the checkout. */
@Processor(QueueName.CREDITS_RENEWAL)
export class CreditsRenewalProcessor extends WorkerHost {
  private readonly logger = new Logger(CreditsRenewalProcessor.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly workspacesService: WorkspacesService,
    private readonly creditsService: CreditsService,
    private readonly renewalReminders: RenewalReminderService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const now = new Date();
    let page = 1;
    let renewed = 0;
    let expired = 0;
    let reminded = 0;

    for (;;) {
      const result = await this.subscriptionsService.findAll({ page, limit: 100 });
      const due = result.items.filter(
        (sub) =>
          sub.status === SubscriptionStatus.ACTIVE &&
          sub.currentPeriodEnd !== null &&
          sub.currentPeriodEnd.getTime() <= now.getTime(),
      );

      // Plans that are about to end get a heads-up email (3 days, then 1 day before).
      for (const sub of result.items) {
        if (sub.status === SubscriptionStatus.ACTIVE && (await this.renewalReminders.remindIfDue(sub, now))) {
          reminded += 1;
        }
      }

      for (const subscription of due) {
        try {
          const workspaces = await this.workspacesService.findByOrganization(subscription.organizationId);

          if (isPurchasablePlan(subscription.plan)) {
            for (const workspace of workspaces) {
              await this.creditsService.expire(subscription.organizationId, workspace.id);
            }
            await this.subscriptionsService.update(subscription.id, { status: SubscriptionStatus.PAST_DUE });
            await this.renewalReminders.notifyExpired(subscription);
            expired += 1;
            continue;
          }

          const cycleStartAt = now;
          const cycleEndAt = addOneMonth(now);

          for (const workspace of workspaces) {
            await this.creditsService.grantMonthlyRenewal(
              subscription.organizationId,
              workspace.id,
              subscription.plan,
              cycleStartAt,
              cycleEndAt,
            );
          }

          await this.subscriptionsService.update(subscription.id, {
            currentPeriodEnd: cycleEndAt.toISOString(),
          });
          renewed += 1;
        } catch (err) {
          this.logger.error(
            `Failed to renew credits for subscription ${subscription.id}: ${
              err instanceof Error ? err.message : err
            }`,
          );
        }
      }

      if (page >= result.meta.totalPages) break;
      page += 1;
    }

    if (renewed > 0) {
      this.logger.log(`Renewed credits for ${renewed} subscription(s)`);
    }
    if (expired > 0) {
      this.logger.log(`Expired ${expired} unpaid subscription(s)`);
    }
    if (reminded > 0) {
      this.logger.log(`Sent ${reminded} renewal reminder(s)`);
    }
  }
}
