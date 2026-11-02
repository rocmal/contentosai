import { apiRequest } from "./api";

/** The Admin page's calls (apps/api/src/modules/admin). The server refuses them for anyone but a platform admin. */

export interface AdminCustomerPlan {
  subscriptionId: string;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  /** 30-day periods already given after the current one. */
  prepaidPeriods: number;
  /** Last day of access, counting those periods. */
  accessUntil: string | null;
  /** 'razorpay' = paid, 'admin' = given from this page, null = the signup trial. */
  gatewayProvider: string | null;
}

export interface AdminCustomerSummary {
  organizationId: string;
  name: string;
  createdAt: string;
  owner: { userId: string; email: string; name: string; status: string } | null;
  memberCount: number;
  suspendedCount: number;
  plan: AdminCustomerPlan | null;
  /** null = unlimited. */
  balance: number | null;
  lastActiveAt: string | null;
}

export interface AdminCustomerPerson {
  userId: string;
  email: string;
  name: string;
  role: string | null;
  status: string;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  joinedAt: string;
  isOwner: boolean;
}

export interface AdminCustomerWorkspace {
  workspaceId: string;
  name: string;
  balance: number | null;
  hasWallet: boolean;
  cycleEndAt: string | null;
}

export interface AdminCreditTransaction {
  id: string;
  workspaceId: string;
  amount: number;
  reason: string;
  balanceAfter: number | null;
  createdAt: string;
}

export interface AdminActivityEntry {
  id: string;
  organizationId: string | null;
  action: string;
  by: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  /** Only in the cross-customer list. */
  customerName?: string | null;
}

export interface AdminCustomer extends AdminCustomerSummary {
  people: AdminCustomerPerson[];
  workspaces: AdminCustomerWorkspace[];
  transactions: AdminCreditTransaction[];
  activity: AdminActivityEntry[];
}

export interface AdminCustomerPage {
  items: AdminCustomerSummary[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export type AdminGivablePlan = "starter" | "pro";

export function searchAdminCustomers(
  input: { search?: string; page?: number } = {},
): Promise<AdminCustomerPage> {
  const params = new URLSearchParams();
  if (input.search?.trim()) params.set("search", input.search.trim());
  params.set("page", String(input.page ?? 1));
  return apiRequest<AdminCustomerPage>(`/admin/customers?${params.toString()}`);
}

export function getAdminCustomer(
  organizationId: string,
): Promise<AdminCustomer> {
  return apiRequest<AdminCustomer>(`/admin/customers/${organizationId}`);
}

export function listAdminActivity(limit = 30): Promise<AdminActivityEntry[]> {
  return apiRequest<AdminActivityEntry[]>(`/admin/activity?limit=${limit}`);
}

const post = (path: string, body?: unknown): Promise<AdminCustomer> =>
  apiRequest<AdminCustomer>(path, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });

export function adjustAdminCredits(
  organizationId: string,
  workspaceId: string,
  amount: number,
  reason: string,
): Promise<AdminCustomer> {
  return post(
    `/admin/customers/${organizationId}/workspaces/${workspaceId}/credits`,
    { amount, reason },
  );
}

export function giveAdminPlan(
  organizationId: string,
  plan: AdminGivablePlan,
  months: number,
  reason: string,
): Promise<AdminCustomer> {
  return post(`/admin/customers/${organizationId}/plan`, {
    plan,
    months,
    reason,
  });
}

export interface NewAdminCustomer {
  email: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
  plan: "trial" | AdminGivablePlan;
  months: number;
  /** Email them the set-password link (it is also returned to copy). */
  sendEmail: boolean;
  reason: string;
}

/** Opens an account for someone. The link lets them choose a password (valid 7 days); it is shown only now. */
export function createAdminCustomer(
  input: NewAdminCustomer,
): Promise<{ customer: AdminCustomer; setPasswordLink: string }> {
  return apiRequest("/admin/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function setAdminSuspended(
  organizationId: string,
  userId: string,
  suspended: boolean,
  reason: string,
): Promise<AdminCustomer> {
  return post(
    `/admin/customers/${organizationId}/people/${userId}/${suspended ? "suspend" : "reactivate"}`,
    { reason },
  );
}

export function sendAdminPasswordReset(
  organizationId: string,
  userId: string,
): Promise<AdminCustomer> {
  return post(
    `/admin/customers/${organizationId}/people/${userId}/password-reset`,
  );
}
