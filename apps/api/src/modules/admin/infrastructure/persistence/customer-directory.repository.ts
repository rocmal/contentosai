import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions, col, fn, where as sqlWhere } from 'sequelize';
import { PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { OrganizationMemberModel } from '@modules/organizations/infrastructure/persistence/organization-member.model';
import { UserModel } from '@modules/users/infrastructure/persistence/user.model';
import { UserStatus } from '@modules/users/domain/entities/user.entity';
import { accessUntil } from '@modules/billing/domain/entities/subscription.entity';
import { RoleModel } from '@modules/roles/infrastructure/persistence/role.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { SubscriptionModel } from '@modules/billing/infrastructure/persistence/subscription.model';
import { CreditWalletModel } from '@modules/credits/infrastructure/persistence/credit-wallet.model';
import { CustomerDetail, CustomerPerson, CustomerSummary } from '../../domain/customer-directory';
import {
  ICustomerDirectoryRepository,
  SearchCustomersOptions,
} from '../../domain/repositories/customer-directory-repository.interface';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** LIKE treats % and _ as wildcards; a search for "a_b" must find "a_b" only. */
const escapeLike = (term: string): string => term.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * A read model over several modules' tables (organizations, members, users, roles, workspaces, subscriptions,
 * wallets), so the Admin page can list customers in a handful of queries instead of one round of service calls per
 * customer. It never writes: every change an admin makes goes through the owning module's service.
 */
@Injectable()
export class CustomerDirectoryRepository implements ICustomerDirectoryRepository {
  constructor(
    @InjectModel(OrganizationModel) private readonly organizations: typeof OrganizationModel,
    @InjectModel(OrganizationMemberModel) private readonly members: typeof OrganizationMemberModel,
    @InjectModel(UserModel) private readonly users: typeof UserModel,
    @InjectModel(RoleModel) private readonly roles: typeof RoleModel,
    @InjectModel(WorkspaceModel) private readonly workspaces: typeof WorkspaceModel,
    @InjectModel(SubscriptionModel) private readonly subscriptions: typeof SubscriptionModel,
    @InjectModel(CreditWalletModel) private readonly wallets: typeof CreditWalletModel,
  ) {}

  async searchCustomers(
    options: SearchCustomersOptions,
  ): Promise<PaginatedResult<CustomerSummary>> {
    const ids = await this.matchingOrganizationIds(options.search?.trim() ?? '');
    const page = Math.max(1, options.page);
    const limit = Math.max(1, options.limit);
    const { rows, count } =
      ids && ids.length === 0
        ? { rows: [], count: 0 }
        : await this.organizations.findAndCountAll({
            where: ids ? { id: { [Op.in]: ids } } : {},
            order: [['createdAt', 'DESC']],
            limit,
            offset: (page - 1) * limit,
          });
    const customers = await this.describe(rows);
    return {
      items: customers.map(({ people: _people, workspaces: _workspaces, ...summary }) => summary),
      meta: {
        totalItems: count,
        itemCount: customers.length,
        itemsPerPage: limit,
        totalPages: Math.max(1, Math.ceil(count / limit)),
        currentPage: page,
      },
    };
  }

  async findCustomer(organizationId: string): Promise<CustomerDetail | null> {
    const organization = await this.organizations.findByPk(organizationId);
    if (!organization) return null;
    const [customer] = await this.describe([organization]);
    return customer ?? null;
  }

  async findOrganizationOfUser(userId: string): Promise<string | null> {
    const membership = await this.members.findOne({
      where: { userId },
      order: [['createdAt', 'ASC']],
    });
    return membership?.organizationId ?? null;
  }

  async organizationNames(organizationIds: string[]): Promise<Map<string, string>> {
    if (organizationIds.length === 0) return new Map();
    const rows = await this.organizations.findAll({
      where: { id: { [Op.in]: organizationIds } },
      paranoid: false,
    });
    return new Map(rows.map((o) => [o.id, o.name]));
  }

  /** undefined = no search (every customer); otherwise the organizations that match, possibly none. */
  private async matchingOrganizationIds(term: string): Promise<string[] | undefined> {
    if (!term) return undefined;
    const ids = new Set<string>();

    if (UUID_PATTERN.test(term)) {
      const [organization, workspace, memberships] = await Promise.all([
        this.organizations.findByPk(term),
        this.workspaces.findByPk(term),
        this.members.findAll({ where: { userId: term } }),
      ]);
      if (organization) ids.add(organization.id);
      if (workspace) ids.add(workspace.organizationId);
      memberships.forEach((m) => ids.add(m.organizationId));
      return [...ids];
    }

    const like = { [Op.like]: `%${escapeLike(term)}%` };
    const [organizations, users] = await Promise.all([
      this.organizations.findAll({ where: { name: like } }),
      this.users.findAll({
        where: {
          [Op.or]: [
            { email: like },
            { firstName: like },
            { lastName: like },
            sqlWhere(fn('CONCAT', col('firstName'), ' ', col('lastName')), like),
          ],
        } as WhereOptions,
      }),
    ]);
    organizations.forEach((o) => ids.add(o.id));
    if (users.length > 0) {
      const memberships = await this.members.findAll({
        where: { userId: { [Op.in]: users.map((u) => u.id) } },
      });
      memberships.forEach((m) => ids.add(m.organizationId));
    }
    return [...ids];
  }

  private async describe(organizations: OrganizationModel[]): Promise<CustomerDetail[]> {
    if (organizations.length === 0) return [];
    const organizationIds = { [Op.in]: organizations.map((o) => o.id) };

    const [memberships, workspaces, subscriptions, wallets] = await Promise.all([
      this.members.findAll({
        where: { organizationId: organizationIds },
        order: [['createdAt', 'ASC']],
      }),
      this.workspaces.findAll({
        where: { organizationId: organizationIds },
        order: [['createdAt', 'ASC']],
      }),
      this.subscriptions.findAll({
        where: { organizationId: organizationIds },
        order: [['updatedAt', 'DESC']],
      }),
      this.wallets.findAll({ where: { organizationId: organizationIds } }),
    ]);

    const userIds = [...new Set(memberships.map((m) => m.userId))];
    const roleIds = [...new Set(memberships.map((m) => m.roleId))];
    const [users, roles] = await Promise.all([
      userIds.length > 0 ? this.users.findAll({ where: { id: { [Op.in]: userIds } } }) : [],
      roleIds.length > 0 ? this.roles.findAll({ where: { id: { [Op.in]: roleIds } } }) : [],
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    const roleById = new Map(roles.map((r) => [r.id, r]));
    const walletByWorkspace = new Map(wallets.map((w) => [w.workspaceId, w]));

    return organizations.map((organization) => {
      const people: CustomerPerson[] = memberships
        .filter((m) => m.organizationId === organization.id && userById.has(m.userId))
        .map((m) => {
          const user = userById.get(m.userId) as UserModel;
          return {
            userId: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim() || user.email,
            role: roleById.get(m.roleId)?.name ?? null,
            status: user.status,
            isEmailVerified: user.isEmailVerified,
            lastLoginAt: user.lastLoginAt,
            joinedAt: m.createdAt,
            isOwner: user.id === organization.ownerId,
          };
        });

      const ownWorkspaces = workspaces
        .filter((w) => w.organizationId === organization.id)
        .map((w) => {
          const wallet = walletByWorkspace.get(w.id);
          return {
            workspaceId: w.id,
            name: w.name,
            balance: wallet ? wallet.balance : 0,
            hasWallet: Boolean(wallet),
            cycleEndAt: wallet?.cycleEndAt ?? null,
          };
        });

      const subscription = subscriptions.find((s) => s.organizationId === organization.id);
      const owner = people.find((p) => p.isOwner);
      const lastActive = people
        .map((p) => p.lastLoginAt?.getTime() ?? 0)
        .reduce((latest, time) => Math.max(latest, time), 0);

      return {
        organizationId: organization.id,
        name: organization.name,
        createdAt: organization.createdAt,
        owner: owner
          ? { userId: owner.userId, email: owner.email, name: owner.name, status: owner.status }
          : null,
        memberCount: people.length,
        suspendedCount: people.filter((p) => p.status === UserStatus.SUSPENDED).length,
        plan: subscription
          ? {
              subscriptionId: subscription.id,
              plan: subscription.plan,
              status: subscription.status,
              currentPeriodEnd: subscription.currentPeriodEnd,
              prepaidPeriods: subscription.prepaidPeriods ?? 0,
              accessUntil: accessUntil({
                currentPeriodEnd: subscription.currentPeriodEnd,
                prepaidPeriods: subscription.prepaidPeriods ?? 0,
              }),
              gatewayProvider: subscription.gatewayProvider,
            }
          : null,
        balance: ownWorkspaces.some((w) => w.hasWallet && w.balance === null)
          ? null
          : ownWorkspaces.reduce((sum, w) => sum + (w.balance ?? 0), 0),
        lastActiveAt: lastActive > 0 ? new Date(lastActive) : null,
        people,
        workspaces: ownWorkspaces,
      };
    });
  }
}
