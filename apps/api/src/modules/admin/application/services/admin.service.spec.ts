import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { AuthService } from '@modules/auth/application/services/auth.service';
import { UsersService } from '@modules/users/application/services/users.service';
import { UserStatus } from '@modules/users/domain/entities/user.entity';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { CheckoutService } from '@modules/billing/application/services/checkout.service';
import { AuditLogService } from '@modules/audit/application/services/audit-log.service';
import { CustomerDetail } from '../../domain/customer-directory';
import { ICustomerDirectoryRepository } from '../../domain/repositories/customer-directory-repository.interface';
import { AdminService } from './admin.service';

const ORG = '11111111-1111-4111-8111-111111111111';
const WS = '22222222-2222-4222-8222-222222222222';
const OWNER = '33333333-3333-4333-8333-333333333333';
const ADMIN_ID = '44444444-4444-4444-8444-444444444444';

const admin = {
  id: ADMIN_ID,
  email: 'staff@example.com',
  isPlatformAdmin: true,
} as AuthenticatedUser;

const customer = (overrides: Partial<CustomerDetail> = {}): CustomerDetail => ({
  organizationId: ORG,
  name: 'Advisor Amritsar',
  createdAt: new Date('2026-10-01'),
  owner: { userId: OWNER, email: 'owner@example.com', name: 'Owner', status: UserStatus.ACTIVE },
  memberCount: 1,
  suspendedCount: 0,
  plan: {
    subscriptionId: 'sub-1',
    plan: 'starter',
    status: 'trialing',
    currentPeriodEnd: null,
    prepaidPeriods: 0,
    accessUntil: null,
    gatewayProvider: null,
  },
  balance: 120,
  lastActiveAt: null,
  people: [
    {
      userId: OWNER,
      email: 'owner@example.com',
      name: 'Owner',
      role: 'Super Admin',
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      lastLoginAt: null,
      joinedAt: new Date('2026-10-01'),
      isOwner: true,
    },
  ],
  workspaces: [{ workspaceId: WS, name: 'Main', balance: 120, hasWallet: true, cycleEndAt: null }],
  ...overrides,
});

describe('AdminService', () => {
  let service: AdminService;
  let directory: jest.Mocked<ICustomerDirectoryRepository>;
  let creditsService: jest.Mocked<CreditsService>;
  let checkoutService: jest.Mocked<CheckoutService>;
  let usersService: jest.Mocked<UsersService>;
  let authService: jest.Mocked<AuthService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    directory = {
      searchCustomers: jest.fn(),
      findCustomer: jest.fn().mockResolvedValue(customer()),
      findOrganizationOfUser: jest.fn(),
      organizationNames: jest.fn().mockResolvedValue(new Map([[ORG, 'Advisor Amritsar']])),
    };
    creditsService = {
      adjust: jest.fn().mockResolvedValue({ balance: 620 }),
      listTransactions: jest.fn().mockResolvedValue({ items: [], meta: {} }),
    } as unknown as jest.Mocked<CreditsService>;
    checkoutService = {
      grantPeriods: jest.fn().mockResolvedValue({
        currentPeriodEnd: new Date('2026-12-02T00:00:00Z'),
        prepaidPeriods: 2,
        extended: false,
      }),
    } as unknown as jest.Mocked<CheckoutService>;
    usersService = { setStatus: jest.fn() } as unknown as jest.Mocked<UsersService>;
    authService = {
      isPlatformAdmin: jest.fn().mockReturnValue(false),
      signOutEverywhere: jest.fn(),
      forgotPassword: jest.fn(),
      createAccountForCustomer: jest.fn().mockResolvedValue({
        userId: OWNER,
        organizationId: ORG,
        setPasswordLink: 'https://lumoraos.in/reset-password?token=abc&welcome=1',
      }),
    } as unknown as jest.Mocked<AuthService>;
    auditLogService = {
      record: jest.fn(),
      listRecent: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<AuditLogService>;

    service = new AdminService(
      directory,
      creditsService,
      checkoutService,
      usersService,
      authService,
      auditLogService,
    );
  });

  describe('adjustCredits', () => {
    it("adds credits and writes the reason and the admin's email to the audit log", async () => {
      await service.adjustCredits(admin, ORG, WS, 500, 'Support ticket #12');

      expect(creditsService.adjust).toHaveBeenCalledWith({
        workspaceId: WS,
        amount: 500,
        actorId: ADMIN_ID,
        note: 'Support ticket #12',
      });
      expect(auditLogService.record).toHaveBeenCalledWith({
        organizationId: ORG,
        userId: ADMIN_ID,
        action: 'admin.credits.added',
        entityType: 'CreditWallet',
        entityId: WS,
        changes: {
          amount: 500,
          balanceBefore: 120,
          balanceAfter: 620,
          reason: 'Support ticket #12',
          by: 'staff@example.com',
        },
      });
    });

    it('never takes a balance below zero', async () => {
      await expect(service.adjustCredits(admin, ORG, WS, -121, 'Too many')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(creditsService.adjust).not.toHaveBeenCalled();
    });

    it("refuses a workspace that is not the customer's", async () => {
      await expect(
        service.adjustCredits(admin, ORG, '55555555-5555-4555-8555-555555555555', 10, 'Wrong one'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(creditsService.adjust).not.toHaveBeenCalled();
    });

    it('leaves unlimited (Enterprise) wallets alone', async () => {
      directory.findCustomer.mockResolvedValue(
        customer({
          workspaces: [
            { workspaceId: WS, name: 'Main', balance: null, hasWallet: true, cycleEndAt: null },
          ],
        }),
      );
      await expect(service.adjustCredits(admin, ORG, WS, 10, 'Bonus')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('givePlan', () => {
    it('gives the months without a payment and records when access ends', async () => {
      await service.givePlan(admin, ORG, 'pro', 3, 'Pilot customer');

      expect(checkoutService.grantPeriods).toHaveBeenCalledWith({
        organizationId: ORG,
        plan: 'pro',
        periods: 3,
        reference: expect.stringMatching(/^admin:/),
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.plan.given',
          changes: expect.objectContaining({
            plan: 'pro',
            months: 3,
            creditsPerPeriod: 10000,
            // 2 Dec plus the 2 periods queued after it
            accessUntil: '2027-01-31T00:00:00.000Z',
            previousPlan: 'starter',
            previousStatus: 'trialing',
            reason: 'Pilot customer',
            by: 'staff@example.com',
          }),
        }),
      );
    });
  });

  describe('createCustomer', () => {
    const input = {
      email: ' Advisor@Example.com ',
      firstName: 'Gurpreet',
      lastName: 'Singh',
      organizationName: 'Singh Insurance',
      plan: 'starter' as const,
      months: 3,
      sendEmail: true,
      reason: 'Paid by bank transfer',
    };

    it('opens the account, gives the plan and hands back the set-password link', async () => {
      const result = await service.createCustomer(admin, input);

      expect(authService.createAccountForCustomer).toHaveBeenCalledWith(
        {
          email: 'Advisor@Example.com',
          firstName: 'Gurpreet',
          lastName: 'Singh',
          organizationName: 'Singh Insurance',
          sendEmail: true,
        },
        ADMIN_ID,
      );
      expect(checkoutService.grantPeriods).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: ORG, plan: 'starter', periods: 3 }),
      );
      expect(result.setPasswordLink).toContain('/reset-password?token=');
      expect(result.customer.organizationId).toBe(ORG);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.customer.created',
          changes: expect.objectContaining({
            email: 'advisor@example.com',
            plan: 'starter',
            months: 3,
            emailed: true,
          }),
        }),
      );
    });

    it('passes a password the admin set, keeps it out of the audit log, and does not need a reason', async () => {
      await service.createCustomer(admin, {
        ...input,
        password: 'Chosen-pass-1',
        reason: undefined,
      });

      expect(authService.createAccountForCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'Chosen-pass-1' }),
        ADMIN_ID,
      );
      const logged = auditLogService.record.mock.calls[0][0];
      expect(logged.changes).toEqual(
        expect.objectContaining({ passwordSetByAdmin: true, reason: null }),
      );
      expect(JSON.stringify(logged)).not.toContain('Chosen-pass-1');
    });

    it('leaves a trial account on the usual trial', async () => {
      await service.createCustomer(admin, { ...input, plan: 'trial' });
      expect(checkoutService.grantPeriods).not.toHaveBeenCalled();
    });
  });

  describe('setSuspended', () => {
    it('suspends the person and signs them out everywhere', async () => {
      await service.setSuspended(admin, ORG, OWNER, true, 'Chargeback');

      expect(usersService.setStatus).toHaveBeenCalledWith(OWNER, UserStatus.SUSPENDED, ADMIN_ID);
      expect(authService.signOutEverywhere).toHaveBeenCalledWith(OWNER);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.user.suspended', entityId: OWNER }),
      );
    });

    it('reactivates a suspended person', async () => {
      directory.findCustomer.mockResolvedValue(
        customer({
          people: [{ ...customer().people[0], status: UserStatus.SUSPENDED }],
        }),
      );
      await service.setSuspended(admin, ORG, OWNER, false, 'Paid up');

      expect(usersService.setStatus).toHaveBeenCalledWith(OWNER, UserStatus.ACTIVE, ADMIN_ID);
      expect(authService.signOutEverywhere).not.toHaveBeenCalled();
    });

    it('will not suspend the admin themselves or another platform admin', async () => {
      directory.findCustomer.mockResolvedValue(
        customer({ people: [{ ...customer().people[0], userId: ADMIN_ID }] }),
      );
      await expect(service.setSuspended(admin, ORG, ADMIN_ID, true, 'Oops')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      directory.findCustomer.mockResolvedValue(customer());
      authService.isPlatformAdmin.mockReturnValue(true);
      await expect(service.setSuspended(admin, ORG, OWNER, true, 'Oops')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(usersService.setStatus).not.toHaveBeenCalled();
    });

    it('refuses someone outside the organization', async () => {
      await expect(
        service.setSuspended(admin, ORG, '66666666-6666-4666-8666-666666666666', true, 'Who?'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does nothing (and logs nothing) when the person is already in that state', async () => {
      await service.setSuspended(admin, ORG, OWNER, false, 'Already active');
      expect(usersService.setStatus).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('sendPasswordReset', () => {
    it('sends the usual reset email and records it', async () => {
      await service.sendPasswordReset(admin, ORG, OWNER);
      expect(authService.forgotPassword).toHaveBeenCalledWith('owner@example.com');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.user.password-reset-sent' }),
      );
    });

    it('refuses a suspended account', async () => {
      directory.findCustomer.mockResolvedValue(
        customer({ people: [{ ...customer().people[0], status: UserStatus.SUSPENDED }] }),
      );
      await expect(service.sendPasswordReset(admin, ORG, OWNER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(authService.forgotPassword).not.toHaveBeenCalled();
    });
  });

  it('shows who did what without repeating the email inside the details', async () => {
    auditLogService.listRecent.mockResolvedValue([
      {
        id: 'log-1',
        organizationId: ORG,
        userId: ADMIN_ID,
        action: 'admin.credits.added',
        entityType: 'CreditWallet',
        entityId: WS,
        changes: { amount: 500, reason: 'Bonus', by: 'staff@example.com' },
        ipAddress: null,
        createdAt: new Date('2026-11-02'),
        updatedAt: new Date('2026-11-02'),
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
        version: 0,
      },
    ]);

    await expect(service.recentActivity(10)).resolves.toEqual([
      expect.objectContaining({
        by: 'staff@example.com',
        customerName: 'Advisor Amritsar',
        details: { amount: 500, reason: 'Bonus' },
      }),
    ]);
    expect(auditLogService.listRecent).toHaveBeenCalledWith({ actionPrefix: 'admin.', limit: 10 });
  });
});
