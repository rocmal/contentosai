import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { AuthService } from '@modules/auth/application/services/auth.service';
import { UsersService } from '@modules/users/application/services/users.service';
import { UserStatus } from '@modules/users/domain/entities/user.entity';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { PLAN_CREDIT_ALLOTMENTS } from '@modules/credits/credits.constants';
import { CheckoutService } from '@modules/billing/application/services/checkout.service';
import { PurchasablePlan } from '@modules/billing/billing.constants';
import { accessUntil } from '@modules/billing/domain/entities/subscription.entity';
import { AuditLogService } from '@modules/audit/application/services/audit-log.service';
import { AuditLog } from '@modules/audit/domain/entities/audit-log.entity';
import { CustomerDetail, CustomerSummary } from '../../domain/customer-directory';
import {
  CUSTOMER_DIRECTORY_REPOSITORY,
  ICustomerDirectoryRepository,
} from '../../domain/repositories/customer-directory-repository.interface';

export interface CustomerTransaction {
  id: string;
  workspaceId: string;
  amount: number;
  reason: string;
  balanceAfter: number | null;
  createdAt: Date;
}

export interface AdminActivityEntry {
  id: string;
  organizationId: string | null;
  action: string;
  /** Email of the platform admin who did it (kept in the entry, since admins are named by config, not a table). */
  by: string | null;
  details: Record<string, unknown>;
  createdAt: Date;
  /** Only in the cross-customer list (recentActivity); a customer's own activity does not repeat it. */
  customerName?: string | null;
}

export interface CustomerView extends CustomerDetail {
  transactions: CustomerTransaction[];
  activity: AdminActivityEntry[];
}

/**
 * What Lumora's platform admins can do for any customer from the Admin page. Every change goes through the module
 * that owns it (credits, billing, users, auth), says why, and is written to the audit log with the admin's email.
 * Routes reach this only through @PlatformAdminOnly() (AdminController).
 */
@Injectable()
export class AdminService {
  constructor(
    @Inject(CUSTOMER_DIRECTORY_REPOSITORY)
    private readonly directory: ICustomerDirectoryRepository,
    private readonly creditsService: CreditsService,
    private readonly checkoutService: CheckoutService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly auditLogService: AuditLogService,
  ) {}

  searchCustomers(options: {
    search?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<CustomerSummary>> {
    return this.directory.searchCustomers(options);
  }

  async getCustomer(organizationId: string): Promise<CustomerView> {
    const customer = await this.requireCustomer(organizationId);
    const [transactions, activity] = await Promise.all([
      this.recentTransactions(customer),
      this.auditLogService.listRecent({ organizationId, limit: 30 }),
    ]);
    return { ...customer, transactions, activity: activity.map(toActivityEntry) };
  }

  /** What the platform admins did lately, across every customer, each with the customer's name. */
  async recentActivity(limit: number): Promise<AdminActivityEntry[]> {
    const entries = await this.auditLogService.listRecent({ actionPrefix: 'admin.', limit });
    const ids = [
      ...new Set(entries.map((e) => e.organizationId).filter((id): id is string => !!id)),
    ];
    const names = await this.directory.organizationNames(ids);
    return entries.map((entry) => ({
      ...toActivityEntry(entry),
      customerName: entry.organizationId ? (names.get(entry.organizationId) ?? null) : null,
    }));
  }

  async adjustCredits(
    admin: AuthenticatedUser,
    organizationId: string,
    workspaceId: string,
    amount: number,
    reason: string,
  ): Promise<CustomerView> {
    const customer = await this.requireCustomer(organizationId);
    const workspace = customer.workspaces.find((w) => w.workspaceId === workspaceId);
    if (!workspace) {
      throw new NotFoundException('That workspace does not belong to this customer.');
    }
    if (!workspace.hasWallet) {
      throw new BadRequestException('This workspace has no credit wallet yet.');
    }
    if (workspace.balance === null) {
      throw new BadRequestException(
        'This workspace has unlimited credits, so there is nothing to add or remove.',
      );
    }
    if (amount < 0 && workspace.balance + amount < 0) {
      throw new BadRequestException(
        `This workspace has ${workspace.balance} credits, so at most ${workspace.balance} can be removed.`,
      );
    }

    const wallet = await this.creditsService.adjust({
      workspaceId,
      amount,
      actorId: admin.id,
      note: reason,
    });
    await this.record(admin, {
      organizationId,
      action: amount > 0 ? 'admin.credits.added' : 'admin.credits.removed',
      entityType: 'CreditWallet',
      entityId: workspaceId,
      details: { amount, balanceBefore: workspace.balance, balanceAfter: wallet.balance, reason },
    });
    return this.getCustomer(organizationId);
  }

  /** Starter or Pro for `months` 30-day periods without a payment (CheckoutService.grantPeriods): the same plan still
   * running is extended, anything else starts today; credits reset every 30 days and the plan lapses after the last. */
  async givePlan(
    admin: AuthenticatedUser,
    organizationId: string,
    plan: PurchasablePlan,
    months: number,
    reason: string,
  ): Promise<CustomerView> {
    const customer = await this.requireCustomer(organizationId);
    if (customer.workspaces.length === 0) {
      throw new BadRequestException('This customer has no workspace to give the credits to.');
    }

    const granted = await this.checkoutService.grantPeriods({
      organizationId,
      plan,
      periods: months,
      reference: `admin:${randomUUID()}`,
    });
    await this.record(admin, {
      organizationId,
      action: 'admin.plan.given',
      entityType: 'Subscription',
      entityId: customer.plan?.subscriptionId ?? null,
      details: {
        plan,
        months,
        extended: granted.extended,
        creditsPerPeriod: PLAN_CREDIT_ALLOTMENTS[plan],
        accessUntil: accessUntil(granted)?.toISOString() ?? null,
        previousPlan: customer.plan?.plan ?? null,
        previousStatus: customer.plan?.status ?? null,
        reason,
      },
    });
    return this.getCustomer(organizationId);
  }

  /**
   * Opens an account for someone (until the payment gateway is live): a sign-up's organization, workspace and trial,
   * then the plan if one is chosen. Either the admin sets the password (the account works at once), or the person
   * sets it with the link, which is returned once to copy (e.g. to WhatsApp) and emailed when asked.
   */
  async createCustomer(
    admin: AuthenticatedUser,
    input: {
      email: string;
      firstName: string;
      lastName: string;
      organizationName?: string;
      plan: 'trial' | PurchasablePlan;
      months: number;
      /** Omitted: the person chooses one with the set-password link. */
      password?: string;
      sendEmail: boolean;
      reason?: string;
    },
  ): Promise<{ customer: CustomerView; setPasswordLink: string | null }> {
    const { organizationId, setPasswordLink } = await this.authService.createAccountForCustomer(
      {
        email: input.email.trim(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        organizationName: input.organizationName?.trim() || undefined,
        password: input.password || undefined,
        sendEmail: input.sendEmail,
      },
      admin.id,
    );

    const granted =
      input.plan === 'trial'
        ? null
        : await this.checkoutService.grantPeriods({
            organizationId,
            plan: input.plan,
            periods: input.months,
            reference: `admin:${randomUUID()}`,
          });
    await this.record(admin, {
      organizationId,
      action: 'admin.customer.created',
      entityType: 'Organization',
      entityId: organizationId,
      details: {
        email: input.email.trim().toLowerCase(),
        plan: input.plan,
        months: granted ? input.months : null,
        accessUntil: granted ? (accessUntil(granted)?.toISOString() ?? null) : null,
        emailed: input.sendEmail,
        // Whether the admin chose it - never the password itself.
        passwordSetByAdmin: Boolean(input.password),
        reason: input.reason?.trim() || null,
      },
    });
    return { customer: await this.getCustomer(organizationId), setPasswordLink };
  }

  /** A suspended person cannot sign in, and is signed out everywhere at once (AuthService.buildAuthenticatedUser
   * refuses them on every request). Their content and the workspace stay as they are. */
  async setSuspended(
    admin: AuthenticatedUser,
    organizationId: string,
    userId: string,
    suspended: boolean,
    reason: string,
  ): Promise<CustomerView> {
    const person = await this.requirePerson(organizationId, userId);
    if (suspended && userId === admin.id) {
      throw new BadRequestException('You cannot suspend your own account.');
    }
    if (suspended && this.authService.isPlatformAdmin(person.email)) {
      throw new BadRequestException(
        'This is a platform admin. Remove them from PLATFORM_ADMIN_EMAILS before suspending the account.',
      );
    }
    const isSuspended = person.status === UserStatus.SUSPENDED;
    if (suspended === isSuspended) return this.getCustomer(organizationId);

    await this.usersService.setStatus(
      userId,
      suspended ? UserStatus.SUSPENDED : UserStatus.ACTIVE,
      admin.id,
    );
    if (suspended) await this.authService.signOutEverywhere(userId);
    await this.record(admin, {
      organizationId,
      action: suspended ? 'admin.user.suspended' : 'admin.user.reactivated',
      entityType: 'User',
      entityId: userId,
      details: { email: person.email, reason },
    });
    return this.getCustomer(organizationId);
  }

  /** Emails the person the same reset link as "Forgot password"; the admin never sees or sets the password. */
  async sendPasswordReset(
    admin: AuthenticatedUser,
    organizationId: string,
    userId: string,
  ): Promise<CustomerView> {
    const person = await this.requirePerson(organizationId, userId);
    if (person.status === UserStatus.SUSPENDED) {
      throw new BadRequestException(
        'Reactivate the account first: a suspended account cannot sign in.',
      );
    }
    await this.authService.forgotPassword(person.email);
    await this.record(admin, {
      organizationId,
      action: 'admin.user.password-reset-sent',
      entityType: 'User',
      entityId: userId,
      details: { email: person.email },
    });
    return this.getCustomer(organizationId);
  }

  private async requireCustomer(organizationId: string): Promise<CustomerDetail> {
    const customer = await this.directory.findCustomer(organizationId);
    if (!customer) throw new NotFoundException('No customer with that id.');
    return customer;
  }

  private async requirePerson(organizationId: string, userId: string) {
    const customer = await this.requireCustomer(organizationId);
    const person = customer.people.find((p) => p.userId === userId);
    if (!person) throw new NotFoundException('That person is not in this organization.');
    return person;
  }

  private async recentTransactions(customer: CustomerDetail): Promise<CustomerTransaction[]> {
    const pages = await Promise.all(
      customer.workspaces
        .filter((w) => w.hasWallet)
        .map((w) => this.creditsService.listTransactions(w.workspaceId, { page: 1, limit: 25 })),
    );
    return pages
      .flatMap((page) => page.items)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 25)
      .map((tx) => ({
        id: tx.id,
        workspaceId: tx.workspaceId,
        amount: tx.amount,
        reason: tx.reason,
        balanceAfter: tx.balanceAfter,
        createdAt: tx.createdAt,
      }));
  }

  private async record(
    admin: AuthenticatedUser,
    entry: {
      organizationId: string;
      action: string;
      entityType: string;
      entityId: string | null;
      details: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.auditLogService.record({
      organizationId: entry.organizationId,
      userId: admin.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      changes: { ...entry.details, by: admin.email },
    });
  }
}

function toActivityEntry(log: AuditLog): AdminActivityEntry {
  const { by, ...details } = log.changes ?? {};
  return {
    id: log.id,
    organizationId: log.organizationId,
    action: log.action,
    by: typeof by === 'string' ? by : null,
    details,
    createdAt: log.createdAt,
  };
}
