/** What Lumora's platform admins see about a customer (one organization) on the Admin page. Read-only. */

export interface CustomerPerson {
  userId: string;
  email: string;
  name: string;
  /** The person's role in the organization, e.g. "Super Admin"; null when the role was removed. */
  role: string | null;
  status: string;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  joinedAt: Date;
  isOwner: boolean;
}

export interface CustomerWorkspace {
  workspaceId: string;
  name: string;
  /** Credits left; null = unlimited (Enterprise). */
  balance: number | null;
  /** False for a workspace that never got a wallet (it cannot spend or be given credits). */
  hasWallet: boolean;
  cycleEndAt: Date | null;
}

export interface CustomerPlan {
  subscriptionId: string;
  plan: string;
  status: string;
  currentPeriodEnd: Date | null;
  /** 30-day periods already given after the current one. */
  prepaidPeriods: number;
  /** Last day of access, counting those periods. */
  accessUntil: Date | null;
  /** 'razorpay' for a payment, 'admin' when a platform admin gave it, null for the signup trial. */
  gatewayProvider: string | null;
}

export interface CustomerSummary {
  organizationId: string;
  name: string;
  createdAt: Date;
  owner: { userId: string; email: string; name: string; status: string } | null;
  memberCount: number;
  suspendedCount: number;
  plan: CustomerPlan | null;
  /** All workspaces' credits together; null when one of them is unlimited. */
  balance: number | null;
  /** Most recent sign-in of anyone in the organization. */
  lastActiveAt: Date | null;
}

export interface CustomerDetail extends CustomerSummary {
  people: CustomerPerson[];
  workspaces: CustomerWorkspace[];
}
