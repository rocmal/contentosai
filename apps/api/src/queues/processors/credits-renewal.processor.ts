import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SubscriptionsService } from '@modules/billing/application/services/subscriptions.service';
import { SubscriptionStatus } from '@modules/billing/domain/entities/subscription.entity';
import { WorkspacesService } from '@modules/workspaces/application/services/workspaces.service';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { QueueName } from '../queue-names';

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

/** Runs on a schedule (registered as a BullMQ repeatable job, see
 * QueuesModule) and resets every workspace's credit wallet to its plan's
 * monthly allotment once a subscription's currentPeriodEnd has passed - the
 * same "no rollover" reset the initial grant does, just repeating on a
 * cadence instead of once at signup. */
@Processor(QueueName.CREDITS_RENEWAL)
export class CreditsRenewalProcessor extends WorkerHost {
  private readonly logger = new Logger(CreditsRenewalProcessor.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly workspacesService: WorkspacesService,
    private readonly creditsService: CreditsService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const now = new Date();
    let page = 1;
    let renewed = 0;

    for (;;) {
      const result = await this.subscriptionsService.findAll({ page, limit: 100 });
      const due = result.items.filter(
        (sub) =>
          (sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.TRIALING) &&
          sub.currentPeriodEnd !== null &&
          sub.currentPeriodEnd.getTime() <= now.getTime(),
      );

      for (const subscription of due) {
        try {
          const workspaces = await this.workspacesService.findByOrganization(subscription.organizationId);
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
  }
}
