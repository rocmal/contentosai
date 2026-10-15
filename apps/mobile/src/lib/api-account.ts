/** Team, billing (read-only) and notifications/push. */
import { ApiError, request, type AuthUser, type Page } from './api';

// Team ----------------------------------------------------------------------

export interface Role {
  id: string;
  name: string;
  slug: string;
}

export interface TeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
}

export const listRoles = () => request<{ items: Role[] }>('/roles?limit=100').then((r) => r.items);

/** Members come back as bare rows, so users and roles are joined here (same as the web app). */
export async function listTeamMembers(user: AuthUser): Promise<TeamMember[]> {
  if (!user.organizationId) return [];
  const [members, roles] = await Promise.all([
    request<{ id: string; userId: string; roleId: string }[]>(
      `/organizations/${encodeURIComponent(user.organizationId)}/members`,
    ),
    listRoles(),
  ]);
  const roleName = new Map(roles.map((r) => [r.id, r.name]));
  const users = await Promise.all(
    members.map((m) =>
      request<{ firstName: string; lastName: string; email: string }>(`/users/${encodeURIComponent(m.userId)}`),
    ),
  );
  return members.map((m, i) => ({
    userId: m.userId,
    firstName: users[i]?.firstName ?? '',
    lastName: users[i]?.lastName ?? '',
    email: users[i]?.email ?? '',
    roleName: roleName.get(m.roleId) ?? 'Member',
  }));
}

/** Adds someone who already has a Lumora account. Fails with a clear message if they do not, or no seats are left. */
export async function addTeamMemberByEmail(user: AuthUser, email: string, roleId: string): Promise<void> {
  if (!user.organizationId) throw new ApiError(400, 'Your account is not attached to an organization yet.');
  const org = encodeURIComponent(user.organizationId);
  const { candidate } = await request<{ candidate: { id: string } | null }>(
    `/organizations/${org}/members/lookup?email=${encodeURIComponent(email)}`,
  );
  if (!candidate) throw new ApiError(404, `No account found for ${email}. They need to sign up first.`);
  await request(`/organizations/${org}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId: candidate.id, roleId }),
  });
}

export async function removeTeamMember(user: AuthUser, userId: string): Promise<void> {
  if (!user.organizationId) return;
  await request(`/organizations/${encodeURIComponent(user.organizationId)}/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

// Billing -------------------------------------------------------------------

export interface Subscription {
  plan: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  currentPeriodEnd: string | null;
}

export async function getMySubscription(user: AuthUser): Promise<Subscription | null> {
  if (!user.organizationId) return null;
  const r = await request<{ items: Subscription[] }>(
    `/billing/subscriptions?organizationId=${encodeURIComponent(user.organizationId)}&limit=1`,
  );
  return r.items[0] ?? null;
}

// Notifications and push ----------------------------------------------------

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  readAt: string | null;
  createdAt: string;
  /** `link` names the screen to open (see src/lib/links.ts). */
  metadata?: { link?: string; permalink?: string | null } | null;
}

export const listNotifications = (page = 1) => request<Page<AppNotification>>(`/notifications?page=${page}&limit=20`);

export const markNotificationRead = (id: string) =>
  request<AppNotification>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });

export const registerPushToken = (token: string, platform: 'ios' | 'android') =>
  request<{ registered: boolean }>('/notifications/push-tokens', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });

export const unregisterPushToken = (token: string, platform: 'ios' | 'android') =>
  request<{ removed: boolean }>('/notifications/push-tokens/remove', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
