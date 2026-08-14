/**
 * Thin fetch client for the Lumora NestJS API (apps/api).
 *
 * - Base URL comes from VITE_API_URL (falls back to http://localhost:3000,
 *   which matches the backend's own default APP_PORT).
 * - Every successful response from the backend is wrapped in
 *   `{ success: true, data, meta?, timestamp }` by its global
 *   TransformInterceptor; every error is `{ success: false, statusCode,
 *   message, ... }` from its AllExceptionsFilter. This client unwraps both
 *   so callers just get `data` back or a thrown ApiError.
 * - Access/refresh JWTs are persisted in localStorage so a page reload
 *   doesn't force a fresh login; a 401 triggers a single silent refresh
 *   attempt before the request is retried once.
 */

import type { BrandBrain, Campaign, CampaignStatus } from '../types';

const API_BASE_URL =
  ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL as
    | string
    | undefined
  )?.replace(/\/$/, '') || 'http://localhost:3000';

const API_PREFIX = '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  status: string;
  isEmailVerified: boolean;
  /** Current tenant context - resolved server-side from organization
   * membership; workspaceId is the org's first workspace until the app has
   * a real workspace-switcher. Needed to scope requests like content
   * uploads and publishing jobs to the right organization/workspace. */
  organizationId: string | null;
  workspaceId: string | null;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: unknown;
  timestamp: string;
}

interface ErrorEnvelope {
  success: false;
  statusCode: number;
  message: string | string[];
  error?: string;
}

const STORAGE_KEY = 'lumora.tokens';

function readTokens(): TokenPair | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenPair) : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens: TokenPair | null): void {
  if (tokens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function isAuthenticated(): boolean {
  return !!readTokens();
}

async function rawRequest<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, init);
  const contentType = res.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const err = body as ErrorEnvelope | null;
    const message = Array.isArray(err?.message)
      ? err.message.join(', ')
      : err?.message || res.statusText || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }

  if (res.status === 204 || body === null) {
    return undefined as T;
  }

  const envelope = body as SuccessEnvelope<T>;
  // TransformInterceptor (backend) unwraps paginated results so `data` is
  // the bare items array with `meta` hoisted alongside it, not nested
  // inside `data` - every list*() caller here expects the pre-unwrap
  // `{ items, meta }` shape, so reconstruct it rather than fixing each
  // call site (and every future one) individually.
  if (envelope.meta !== undefined && Array.isArray(envelope.data)) {
    return { items: envelope.data, meta: envelope.meta } as T;
  }
  return envelope.data;
}

interface RefreshResult {
  tokens: TokenPair;
  user: AuthUser;
}

let refreshInFlight: Promise<RefreshResult | null> | null = null;

async function performRefresh(): Promise<RefreshResult | null> {
  const tokens = readTokens();
  if (!tokens?.refreshToken) return null;

  try {
    const result = await rawRequest<{ accessToken: string; refreshToken: string; user: AuthUser }>(
      '/auth/refresh',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      },
    );
    const next: TokenPair = { accessToken: result.accessToken, refreshToken: result.refreshToken };
    writeTokens(next);
    return { tokens: next, user: result.user };
  } catch {
    writeTokens(null);
    return null;
  }
}

function refresh(): Promise<RefreshResult | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Authenticated request helper. Attaches the bearer token and retries once through a silent refresh on 401. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = readTokens();
  const headers = new Headers(init.headers);
  // FormData bodies (file uploads) need the browser to set their own
  // multipart boundary - forcing application/json here would break them.
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  try {
    return await rawRequest<T>(path, { ...init, headers });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && tokens) {
      const refreshed = await refresh();
      if (refreshed) {
        headers.set('Authorization', `Bearer ${refreshed.tokens.accessToken}`);
        return await rawRequest<T>(path, { ...init, headers });
      }
    }
    throw err;
  }
}

/** Like rawRequest, but for endpoints that return a binary body (e.g. audio/mpeg) on success instead of the JSON envelope. Errors still come back as the standard JSON envelope. */
async function rawBlobRequest(path: string, init: RequestInit): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, init);

  if (!res.ok) {
    const contentType = res.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json') ? await res.json().catch(() => null) : null;
    const err = body as ErrorEnvelope | null;
    const message = Array.isArray(err?.message)
      ? err.message.join(', ')
      : err?.message || res.statusText || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return res.blob();
}

/** Authenticated request helper for binary responses. Same auth/refresh behavior as apiRequest. */
async function apiRequestBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const tokens = readTokens();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  try {
    return await rawBlobRequest(path, { ...init, headers });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && tokens) {
      const refreshed = await refresh();
      if (refreshed) {
        headers.set('Authorization', `Bearer ${refreshed.tokens.accessToken}`);
        return await rawBlobRequest(path, { ...init, headers });
      }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** /auth/login and /auth/refresh both return a trimmed user (no tenant
 * context) - /users/me additionally resolves the current organization/
 * workspace, so it's fetched once right after tokens are established. */
export function getCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/users/me');
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const result = await rawRequest<{ accessToken: string; refreshToken: string; user: AuthUser }>(
    '/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
  );
  writeTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  return getCurrentUser();
}

/** POST /auth/register creates the account and immediately issues tokens
 * (no separate "verify email before login" gate), so a new signup lands
 * straight in the authenticated app, matching the landing page's "Start
 * free trial" framing. */
export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthUser> {
  const result = await rawRequest<{ accessToken: string; refreshToken: string; user: AuthUser }>(
    '/auth/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  writeTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  return getCurrentUser();
}

/** Silently restores a session on page load using the persisted refresh token, if any. */
export async function restoreSession(): Promise<AuthUser | null> {
  if (!isAuthenticated()) return null;
  const result = await refresh();
  return result ? getCurrentUser() : null;
}

export async function logout(): Promise<void> {
  const tokens = readTokens();
  writeTokens(null);
  if (tokens?.refreshToken) {
    try {
      await rawRequest('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
    } catch {
      // Best-effort server-side revocation; local session is already cleared.
    }
  }
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export interface CampaignListResult {
  items: Campaign[];
  meta: { totalItems: number; itemCount: number; itemsPerPage: number; totalPages: number; currentPage: number };
}

export function listCampaigns(input: { page?: number; limit?: number } = {}): Promise<CampaignListResult> {
  const params = new URLSearchParams();
  params.set('page', String(input.page ?? 1));
  params.set('limit', String(input.limit ?? 50));
  return apiRequest<CampaignListResult>(`/campaigns?${params.toString()}`);
}

export async function createCampaign(input: {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Campaign> {
  const user = await getCurrentUser();
  if (!user.organizationId || !user.workspaceId) {
    throw new ApiError(400, 'Your account is not attached to an organization workspace yet.');
  }
  return apiRequest<Campaign>('/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: user.organizationId,
      workspaceId: user.workspaceId,
      ...input,
    }),
  });
}

export function updateCampaign(
  id: string,
  input: Partial<{ name: string; description: string; startDate: string; endDate: string; status: CampaignStatus }>,
): Promise<Campaign> {
  return apiRequest<Campaign>(`/campaigns/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteCampaign(id: string): Promise<{ deleted: boolean }> {
  return apiRequest(`/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Brand Brain (backed by apps/api's brand-profiles module). The frontend's
// BrandBrain shape and the backend's BrandProfileResponseDto line up field
// for field (aside from name/businessName) - see brand-profiles migration
// 20260807000001 which extended the table to match this type instead of the
// other way around, so no lossy mapping is needed.
// ---------------------------------------------------------------------------

interface BrandProfileDto {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  industry: string | null;
  tagline: string | null;
  toneOfVoice: string[] | null;
  brandColors: string[] | null;
  logoUrl: string | null;
  guidelines: string | null;
  websiteUrl: string | null;
  primaryFont: string | null;
  productsAndServices: string[] | null;
  mission: string | null;
  vision: string | null;
  primaryCTA: string | null;
  targetAudience: string | null;
  competitors: string[] | null;
  keywords: string[] | null;
  socialAccounts: BrandBrain['socialAccounts'] | null;
}

function brandProfileToBrandBrain(p: BrandProfileDto): BrandBrain {
  return {
    id: p.id,
    businessName: p.name,
    industry: p.industry ?? '',
    tagline: p.tagline ?? '',
    logoUrl: p.logoUrl ?? '',
    brandColors: p.brandColors ?? [],
    primaryFont: p.primaryFont ?? '',
    websiteUrl: p.websiteUrl ?? '',
    productsAndServices: p.productsAndServices ?? [],
    mission: p.mission ?? '',
    vision: p.vision ?? '',
    toneOfVoice: p.toneOfVoice ?? [],
    primaryCTA: p.primaryCTA ?? '',
    targetAudience: p.targetAudience ?? '',
    competitors: p.competitors ?? [],
    keywords: p.keywords ?? [],
    guidelines: p.guidelines ?? '',
    socialAccounts: p.socialAccounts ?? [],
  };
}

function brandBrainToDto(b: BrandBrain) {
  return {
    name: b.businessName,
    industry: b.industry || undefined,
    tagline: b.tagline || undefined,
    toneOfVoice: b.toneOfVoice,
    brandColors: b.brandColors,
    logoUrl: b.logoUrl || undefined,
    websiteUrl: b.websiteUrl || undefined,
    primaryFont: b.primaryFont || undefined,
    productsAndServices: b.productsAndServices,
    mission: b.mission || undefined,
    vision: b.vision || undefined,
    primaryCTA: b.primaryCTA || undefined,
    targetAudience: b.targetAudience || undefined,
    competitors: b.competitors,
    keywords: b.keywords,
    guidelines: b.guidelines || undefined,
    socialAccounts: b.socialAccounts,
  };
}

/** The workspace's brand profile, or null if none has been created yet
 * (brand-profiles has no "list mine" endpoint - the tenant guard already
 * scopes GET /brand-profiles to the caller's workspace, same as campaigns). */
export async function getMyBrandProfile(): Promise<BrandBrain | null> {
  const result = await apiRequest<{ items: BrandProfileDto[] }>('/brand-profiles?limit=1');
  return result.items[0] ? brandProfileToBrandBrain(result.items[0]) : null;
}

export async function createBrandProfile(brandBrain: BrandBrain): Promise<BrandBrain> {
  const user = await getCurrentUser();
  if (!user.organizationId || !user.workspaceId) {
    throw new ApiError(400, 'Your account is not attached to an organization workspace yet.');
  }
  const created = await apiRequest<BrandProfileDto>('/brand-profiles', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: user.organizationId,
      workspaceId: user.workspaceId,
      ...brandBrainToDto(brandBrain),
    }),
  });
  return brandProfileToBrandBrain(created);
}

export async function updateBrandProfile(id: string, brandBrain: BrandBrain): Promise<BrandBrain> {
  const updated = await apiRequest<BrandProfileDto>(`/brand-profiles/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(brandBrainToDto(brandBrain)),
  });
  return brandProfileToBrandBrain(updated);
}

/** Creates the workspace's brand profile on first save, updates it on every save after. */
export async function saveBrandProfile(brandBrain: BrandBrain): Promise<BrandBrain> {
  return brandBrain.id ? updateBrandProfile(brandBrain.id, brandBrain) : createBrandProfile(brandBrain);
}

// ---------------------------------------------------------------------------
// Team (organization members + roles)
// ---------------------------------------------------------------------------

interface RawOrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
}

export interface Role {
  id: string;
  organizationId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissionSlugs: string[];
}

export interface TeamMember {
  membershipId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  roleId: string;
  roleName: string;
}

/** Matches UserResponseDto (GET /users/:id) - no organizationId/workspaceId,
 * unlike AuthUser which only GET /users/me resolves those for. */
interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export function listRoles(): Promise<Role[]> {
  return apiRequest<{ items: Role[] }>('/roles?limit=100').then((r) => r.items);
}

/** Members come back as bare {membershipId, userId, roleId} rows - no
 * organizations.controller DTO joins in user/role details, so this fetches
 * each member's user + the role catalogue and joins them client-side. Fine
 * at real-world team sizes; would need a real join endpoint at scale. */
export async function listTeamMembers(): Promise<TeamMember[]> {
  const me = await getCurrentUser();
  if (!me.organizationId) return [];

  const [members, roles] = await Promise.all([
    apiRequest<RawOrganizationMember[]>(`/organizations/${encodeURIComponent(me.organizationId)}/members`),
    listRoles(),
  ]);
  const roleById = new Map(roles.map((r) => [r.id, r]));

  const users = await Promise.all(
    members.map((m) => apiRequest<PublicUser>(`/users/${encodeURIComponent(m.userId)}`)),
  );
  const userById = new Map(users.map((u) => [u.id, u]));

  return members.map((m) => {
    const user = userById.get(m.userId);
    const role = roleById.get(m.roleId);
    return {
      membershipId: m.id,
      userId: m.userId,
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      avatarUrl: user?.avatarUrl ?? null,
      roleId: m.roleId,
      roleName: role?.name ?? m.roleId,
    };
  });
}

/** Adding a member requires their existing user id - there is no
 * email-invite flow (SMTP isn't configured, and building an invitation
 * system is out of scope here). The caller is expected to already know the
 * teammate's user id, e.g. from having them sign up first. */
export async function addTeamMemberById(userId: string, roleId: string): Promise<void> {
  const me = await getCurrentUser();
  if (!me.organizationId) {
    throw new ApiError(400, 'Your account is not attached to an organization yet.');
  }
  await apiRequest(`/organizations/${encodeURIComponent(me.organizationId)}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId, roleId }),
  });
}

export async function removeTeamMember(userId: string): Promise<void> {
  const me = await getCurrentUser();
  if (!me.organizationId) return;
  await apiRequest(`/organizations/${encodeURIComponent(me.organizationId)}/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// Workspace settings (generic per-organization key/value store) + org profile
// ---------------------------------------------------------------------------

interface SettingDto {
  id: string;
  organizationId: string;
  key: string;
  value: unknown;
}

/** Reads a single workspace setting by key. Settings has no "get by key"
 * endpoint - only list (optionally organization-scoped) and get-by-id - so
 * this lists the organization's settings and finds it client-side; fine at
 * the small number of keys this app actually uses. */
export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const me = await getCurrentUser();
  if (!me.organizationId) return null;
  const result = await apiRequest<{ items: SettingDto[] }>(
    `/settings?organizationId=${encodeURIComponent(me.organizationId)}&limit=100`,
  );
  const found = result.items.find((s) => s.key === key);
  return found ? (found.value as T) : null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const me = await getCurrentUser();
  if (!me.organizationId) {
    throw new ApiError(400, 'Your account is not attached to an organization yet.');
  }
  await apiRequest(`/settings/${encodeURIComponent(me.organizationId)}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export interface OrganizationProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export async function getMyOrganization(): Promise<OrganizationProfile | null> {
  const me = await getCurrentUser();
  if (!me.organizationId) return null;
  return apiRequest<OrganizationProfile>(`/organizations/${encodeURIComponent(me.organizationId)}`);
}

export async function updateMyOrganization(input: { name?: string; description?: string }): Promise<OrganizationProfile> {
  const me = await getCurrentUser();
  if (!me.organizationId) {
    throw new ApiError(400, 'Your account is not attached to an organization yet.');
  }
  return apiRequest<OrganizationProfile>(`/organizations/${encodeURIComponent(me.organizationId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Billing (subscription + Razorpay checkout - see BillingView.tsx for the
// actual Checkout widget integration)
// ---------------------------------------------------------------------------

export interface Subscription {
  id: string;
  organizationId: string;
  plan: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  currentPeriodEnd: string | null;
}

export async function getMySubscription(): Promise<Subscription | null> {
  const me = await getCurrentUser();
  if (!me.organizationId) return null;
  const result = await apiRequest<{ items: Subscription[] }>(
    `/billing/subscriptions?organizationId=${encodeURIComponent(me.organizationId)}&limit=1`,
  );
  return result.items[0] ?? null;
}

export type PurchasablePlan = 'starter' | 'pro';

export interface CheckoutOrder {
  orderId: string;
  /** Smallest currency unit (paise for INR). */
  amount: number;
  currency: string;
  /** Razorpay's publishable key id - passed to the Checkout widget's `key` option. */
  keyId: string;
}

/** Creates a Razorpay order for a plan upgrade - the caller opens the
 * Checkout widget with this, and the subscription/credits only actually
 * activate once RazorpayWebhookController confirms payment.captured. */
export function createCheckoutOrder(plan: PurchasablePlan): Promise<CheckoutOrder> {
  return apiRequest<CheckoutOrder>('/billing/checkout/order', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

/** USD exchange rate for display-only price localization (see
 * lib/currency.ts's detectLikelyCurrency + pricingPlans.ts's formatPlanPrice).
 * Never throws - falls back to `{ USD, 1 }` so a flaky rate source can never
 * break a pricing page. */
export async function fetchExchangeRate(currency: string): Promise<{ currency: string; rate: number }> {
  try {
    return await apiRequest<{ currency: string; rate: number }>(
      `/pricing/fx-rate?currency=${encodeURIComponent(currency)}`,
    );
  } catch {
    return { currency: 'USD', rate: 1 };
  }
}

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';

export interface SalesInquiryInput {
  fullName: string;
  workEmail: string;
  companyName: string;
  companySize: CompanySize;
  phone?: string;
  message: string;
}

/** Enterprise "Contact Sales" form - reachable pre-login (rawRequest, not
 * apiRequest), since a visitor evaluating Enterprise on the public landing
 * page has no account/JWT yet. */
export function submitSalesInquiry(input: SalesInquiryInput): Promise<{ submitted: boolean }> {
  return rawRequest<{ submitted: boolean }>('/contact/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Automation workflows
// ---------------------------------------------------------------------------

export type AutomationWorkflowStatus = 'active' | 'inactive';

export interface AutomationWorkflow {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  trigger: string;
  status: AutomationWorkflowStatus;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export async function listAutomationWorkflows(): Promise<AutomationWorkflow[]> {
  const me = await getCurrentUser();
  if (!me.workspaceId) return [];
  const result = await apiRequest<{ items: AutomationWorkflow[] }>(
    `/automation/workflows?workspaceId=${encodeURIComponent(me.workspaceId)}&limit=100`,
  );
  return result.items;
}

export async function createAutomationWorkflow(input: { name: string; trigger: string }): Promise<AutomationWorkflow> {
  const me = await getCurrentUser();
  if (!me.organizationId || !me.workspaceId) {
    throw new ApiError(400, 'Your account is not attached to an organization workspace yet.');
  }
  return apiRequest<AutomationWorkflow>('/automation/workflows', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: me.organizationId,
      workspaceId: me.workspaceId,
      ...input,
    }),
  });
}

export function updateAutomationWorkflow(
  id: string,
  input: Partial<{ name: string; trigger: string; status: AutomationWorkflowStatus }>,
): Promise<AutomationWorkflow> {
  return apiRequest<AutomationWorkflow>(`/automation/workflows/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteAutomationWorkflow(id: string): Promise<{ deleted: boolean }> {
  return apiRequest(`/automation/workflows/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

export interface CreditWallet {
  id: string;
  organizationId: string;
  workspaceId: string;
  /** null = unlimited (Enterprise plan). */
  balance: number | null;
  cycleStartAt: string | null;
  cycleEndAt: string | null;
}

export interface CreditTransaction {
  id: string;
  userId: string | null;
  amount: number;
  reason: string;
  relatedEntityId: string | null;
  balanceAfter: number | null;
  createdAt: string;
}

export function getMyCreditWallet(): Promise<CreditWallet> {
  return apiRequest<CreditWallet>('/credits/wallet');
}

export async function listMyCreditTransactions(input: { page?: number; limit?: number } = {}): Promise<{
  items: CreditTransaction[];
  meta: { totalItems: number; itemCount: number; itemsPerPage: number; totalPages: number; currentPage: number };
}> {
  const params = new URLSearchParams();
  params.set('page', String(input.page ?? 1));
  params.set('limit', String(input.limit ?? 20));
  return apiRequest(`/credits/transactions?${params.toString()}`);
}

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export async function updateMyProfile(input: {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}): Promise<AuthUser> {
  const me = await getCurrentUser();
  // PATCH /users/:id returns a bare UserResponseDto (no organizationId/
  // workspaceId - those are only resolved specially by GET /users/me), so
  // re-fetch the full tenant-aware profile after the update rather than
  // trusting this response's shape to match AuthUser.
  await apiRequest(`/users/${encodeURIComponent(me.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return getCurrentUser();
}

/** Reuses the existing forgot-password email flow as the self-service
 * "change my password" action - there is no separate authenticated
 * change-password endpoint, and this one already works end to end. */
export function requestMyPasswordReset(email: string): Promise<{ sent: boolean }> {
  return rawRequest<{ sent: boolean }>('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

// ---------------------------------------------------------------------------
// AI text generation (generic - used for e.g. "improve with AI" buttons on
// any freeform text field, not just AI Studio's own wizard).
// ---------------------------------------------------------------------------

export interface TextGenerationResult {
  text: string;
  provider: string;
  model: string;
}

export async function generateText(input: {
  prompt: string;
  systemPrompt?: string;
}): Promise<TextGenerationResult> {
  return apiRequest<TextGenerationResult>('/ai/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface ProviderStatus {
  name: string;
  available: boolean;
}

/** Whether each AI text provider (openai/gemini/claude/openrouter/sarvam)
 * has an API key configured on the backend - read-only, there's no
 * per-workspace "connect" action for these (they're server-side keys). */
export async function getAiProviderStatuses(): Promise<ProviderStatus[]> {
  const { statuses } = await apiRequest<{ statuses: ProviderStatus[] }>('/ai/providers/status');
  return statuses;
}

// ---------------------------------------------------------------------------
// Image Studio
// ---------------------------------------------------------------------------

export const IMAGE_PROVIDERS = ['openai', 'stability', 'flux'] as const;
export type ImageProvider = (typeof IMAGE_PROVIDERS)[number];

export interface ImageGenerationResult {
  provider: string;
  model: string;
  status: 'completed' | 'processing';
  images: string[];
  jobId?: string;
}

export async function generateImage(input: {
  prompt: string;
  provider: ImageProvider;
  model?: string;
  size?: string;
  count?: number;
}): Promise<ImageGenerationResult> {
  return apiRequest<ImageGenerationResult>('/image/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Voice Studio
// ---------------------------------------------------------------------------

// "edge" (Microsoft Edge TTS) needs no account/key/billing, so it's the
// backend's default (VOICE_PROVIDER=edge) and listed first here.
export const VOICE_PROVIDERS = ['edge', 'elevenlabs', 'cartesia', 'azure', 'piper', 'sarvam'] as const;
export type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

export interface VoiceGenerationResult {
  /** Blob object URL - call URL.revokeObjectURL(audioUrl) once playback is done with it. */
  audioUrl: string;
  mimeType: string;
}

/** POST /voice/generate now returns raw audio/mpeg bytes on success (not the JSON envelope), so playback needs no base64 decoding. */
export async function generateSpeech(input: {
  text: string;
  provider?: VoiceProvider;
  voiceId?: string;
  model?: string;
  /** BCP-47 code (e.g. "hi-IN") - only used by multi-language providers (currently Sarvam). */
  languageCode?: string;
}): Promise<VoiceGenerationResult> {
  const blob = await apiRequestBlob('/voice/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return { audioUrl: URL.createObjectURL(blob), mimeType: blob.type || 'audio/mpeg' };
}

/** Whether each voice provider is configured/reachable - read-only status,
 * same shape as getAiProviderStatuses. */
export async function getVoiceProviderStatuses(): Promise<ProviderStatus[]> {
  const { statuses } = await apiRequest<{ statuses: ProviderStatus[] }>('/voice/providers/status');
  return statuses;
}

// ---------------------------------------------------------------------------
// Video Studio
// ---------------------------------------------------------------------------

// "mock" is a free, no-key local-dev provider - the backend only honors it
// outside production (see VideoProviderFactory).
export const VIDEO_PROVIDERS = ['veo', 'runway', 'kling', 'pika', 'luma', 'mock'] as const;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];
export type VideoJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface VideoGenerationResult {
  provider: string;
  model: string;
  jobId: string;
  status: VideoJobStatus;
  videoUrl?: string;
}

export async function generateVideo(input: {
  prompt: string;
  provider: VideoProvider;
  model?: string;
  imageUrl?: string;
  durationSeconds?: number;
}): Promise<VideoGenerationResult> {
  return apiRequest<VideoGenerationResult>('/video/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getVideoJobStatus(
  provider: string,
  jobId: string,
): Promise<VideoGenerationResult> {
  return apiRequest<VideoGenerationResult>(
    `/video/jobs/${encodeURIComponent(jobId)}?provider=${encodeURIComponent(provider)}`,
    { method: 'GET' },
  );
}

/** Polls a submitted video job until it completes/fails or the timeout elapses. */
export async function pollVideoJob(
  provider: string,
  jobId: string,
  options?: { intervalMs?: number; timeoutMs?: number; onUpdate?: (result: VideoGenerationResult) => void },
): Promise<VideoGenerationResult> {
  const intervalMs = options?.intervalMs ?? 3000;
  const timeoutMs = options?.timeoutMs ?? 180_000;
  const startedAt = Date.now();

  for (;;) {
    const status = await getVideoJobStatus(provider, jobId);
    options?.onUpdate?.(status);
    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new ApiError(408, 'Video generation timed out while waiting for the provider.');
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// ---------------------------------------------------------------------------
// Character Studio - upload a portrait photo, type a script, get back a
// lip-synced talking-avatar video (D-ID). Same async job/poll shape as Video
// Studio, since every avatar provider takes seconds-to-minutes to render.
// ---------------------------------------------------------------------------

export const CHARACTER_PROVIDERS = ['did', 'sadtalker', 'wav2lip'] as const;
export type CharacterProvider = (typeof CHARACTER_PROVIDERS)[number];
export type CharacterJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface CharacterGenerationResult {
  provider: string;
  jobId: string;
  status: CharacterJobStatus;
  videoUrl?: string;
  /** Populated on status 'failed' - e.g. "Face not detected!" for a cartoon avatar. */
  errorMessage?: string;
}

export type AvatarCategory = 'business' | 'marketing' | 'education' | 'custom';
export type AvatarGender = 'female' | 'male' | 'non_binary' | 'unknown';
export type AvatarAgeGroup = 'young_adult' | 'adult' | 'middle_aged' | 'senior' | 'unknown';

export interface Avatar {
  id: string;
  organizationId: string;
  workspaceId: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  category: AvatarCategory;
  gender: AvatarGender;
  language: string | null;
  tags: string[];
  voiceId: string | null;
  emotionDefault: string | null;
  ageGroup: AvatarAgeGroup;
  isFavorite: boolean;
  isPublic: boolean;
  isArchived: boolean;
  qualityScore: number | null;
  provider: string;
  providerAvatarId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AvatarListResult {
  items: Avatar[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface CreateAvatarInput {
  name: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category?: AvatarCategory;
  gender?: AvatarGender;
  language?: string;
  tags?: string[];
  voiceId?: string;
  emotionDefault?: string;
  ageGroup?: AvatarAgeGroup;
  provider?: string;
  qualityScore?: number;
  metadata?: Record<string, unknown>;
}

/** Uploads the source photo so the (external, third-party) avatar provider
 * has a public URL it can fetch - same reasoning as uploadVideoBlob() above
 * for Meta's Graph API. */
async function uploadImageFile(file: File): Promise<StoredFile> {
  const formData = new FormData();
  formData.append('file', file, file.name);
  return apiRequest<StoredFile>('/storage/upload', { method: 'POST', body: formData });
}

export function listAvatars(input: {
  search?: string;
  category?: AvatarCategory | 'all';
  filter?: 'all' | 'favorites' | 'recently_used' | 'recently_created';
  sortBy?: 'newest' | 'oldest' | 'name';
  page?: number;
  limit?: number;
} = {}): Promise<AvatarListResult> {
  const params = new URLSearchParams();
  params.set('page', String(input.page ?? 1));
  params.set('limit', String(input.limit ?? 24));
  if (input.search) params.set('search', input.search);
  if (input.category && input.category !== 'all') params.set('category', input.category);
  if (input.filter && input.filter !== 'all') params.set('filter', input.filter);
  if (input.sortBy) params.set('sortBy', input.sortBy);
  return apiRequest<AvatarListResult>(`/avatars?${params.toString()}`);
}

export async function createAvatar(input: CreateAvatarInput): Promise<Avatar> {
  const user = await getCurrentUser();
  if (!user.organizationId || !user.workspaceId) {
    throw new ApiError(400, 'Your account is not attached to an organization workspace yet.');
  }
  return apiRequest<Avatar>('/avatars', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: user.organizationId,
      workspaceId: user.workspaceId,
      ...input,
    }),
  });
}

export async function createAvatarFromFile(file: File, input: Omit<CreateAvatarInput, 'imageUrl'>): Promise<Avatar> {
  const stored = await uploadImageFile(file);
  return createAvatar({ ...input, imageUrl: stored.url, thumbnailUrl: stored.url });
}

export function updateAvatar(id: string, input: Partial<CreateAvatarInput>): Promise<Avatar> {
  return apiRequest<Avatar>(`/avatars/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteAvatar(id: string): Promise<{ deleted: boolean }> {
  return apiRequest(`/avatars/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function duplicateAvatar(id: string): Promise<Avatar> {
  return apiRequest<Avatar>(`/avatars/${encodeURIComponent(id)}/duplicate`, { method: 'POST' });
}

export function favoriteAvatar(id: string, isFavorite: boolean): Promise<Avatar> {
  return apiRequest<Avatar>(`/avatars/${encodeURIComponent(id)}/${isFavorite ? 'favorite' : 'unfavorite'}`, {
    method: 'POST',
  });
}

export function recordAvatarUsage(id: string): Promise<{ used: boolean }> {
  return apiRequest(`/avatars/${encodeURIComponent(id)}/use`, { method: 'POST', body: JSON.stringify({}) });
}

export async function generateCharacterVideo(input: {
  sourceImage: File;
  script: string;
  provider: CharacterProvider;
  voiceId?: string;
}): Promise<CharacterGenerationResult> {
  const { url } = await uploadImageFile(input.sourceImage);
  return apiRequest<CharacterGenerationResult>('/character/generate', {
    method: 'POST',
    body: JSON.stringify({
      sourceImageUrl: url,
      script: input.script,
      provider: input.provider,
      voiceId: input.voiceId,
    }),
  });
}

export function generateCharacterVideoFromUrl(input: {
  sourceImageUrl: string;
  script: string;
  provider: CharacterProvider;
  voiceId?: string;
}): Promise<CharacterGenerationResult> {
  return apiRequest<CharacterGenerationResult>('/character/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getCharacterJobStatus(
  provider: string,
  jobId: string,
): Promise<CharacterGenerationResult> {
  return apiRequest<CharacterGenerationResult>(
    `/character/jobs/${encodeURIComponent(jobId)}?provider=${encodeURIComponent(provider)}`,
    { method: 'GET' },
  );
}

/** Polls a submitted character video job until it completes/fails or the
 * timeout elapses - avatar rendering is typically slower than plain video
 * generation, hence the longer default timeout. */
export async function pollCharacterJob(
  provider: string,
  jobId: string,
  options?: { intervalMs?: number; timeoutMs?: number; onUpdate?: (result: CharacterGenerationResult) => void },
): Promise<CharacterGenerationResult> {
  const intervalMs = options?.intervalMs ?? 4000;
  const timeoutMs = options?.timeoutMs ?? 300_000;
  const startedAt = Date.now();

  for (;;) {
    let status: CharacterGenerationResult | null = null;
    try {
      status = await getCharacterJobStatus(provider, jobId);
    } catch (err) {
      // A real error response (job not found, auth failure, etc.) should
      // abort immediately. A raw network failure - e.g. the dev API server
      // hot-reloading mid-poll - is transient for a job that's otherwise
      // still rendering fine server-side, so just skip this tick and retry
      // rather than failing the whole generation on one dropped request.
      if (err instanceof ApiError) throw err;
    }
    if (status) {
      options?.onUpdate?.(status);
      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new ApiError(408, 'Character video generation timed out while waiting for the provider.');
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// ---------------------------------------------------------------------------
// Social connections (Meta: Facebook/Instagram) + scheduled publishing
// ---------------------------------------------------------------------------

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'youtube';

export interface SocialConnectionStatus {
  connected: boolean;
  label?: string;
}

/** Per-platform connection status for the current workspace - the backend
 * returns all connected platforms (Meta + LinkedIn + YouTube) from a single
 * shared IntegrationsService.getConnectionStatus() call, so any of the three
 * /status routes returns the same combined object. */
export function getSocialConnectionStatus(): Promise<Record<SocialPlatform, SocialConnectionStatus>> {
  return apiRequest('/integrations/meta/status');
}

/** Resolves the Facebook/Instagram OAuth "connect" URL - navigate the
 * top-level window to it (not fetch) so Meta's login dialog can render. */
export async function getMetaConnectUrl(): Promise<string> {
  const result = await apiRequest<{ url: string }>('/integrations/meta/connect');
  return result.url;
}

/** Resolves the LinkedIn OAuth "connect" URL (posts as the connected member -
 * see LinkedInConnectService for why Company Page posting isn't v1). */
export async function getLinkedInConnectUrl(): Promise<string> {
  const result = await apiRequest<{ url: string }>('/integrations/linkedin/connect');
  return result.url;
}

/** Resolves the YouTube (Google) OAuth "connect" URL. */
export async function getYouTubeConnectUrl(): Promise<string> {
  const result = await apiRequest<{ url: string }>('/integrations/youtube/connect');
  return result.url;
}

interface StoredFile {
  key: string;
  url: string;
}

/** Uploads a video Blob to the backend's configured storage (local disk in
 * dev, S3/MinIO in production) and returns its publicly-reachable URL - this
 * is the URL Meta's Graph API actually fetches the video from when
 * publishing, so it must NOT be a blob:/object URL. */
async function uploadVideoBlob(blob: Blob, filename: string): Promise<StoredFile> {
  const formData = new FormData();
  formData.append('file', blob, filename);
  return apiRequest<StoredFile>('/storage/upload', { method: 'POST', body: formData });
}

export interface PublishingJob {
  id: string;
  contentId: string | null;
  platform: string;
  status: 'scheduled' | 'published' | 'failed';
  scheduledAt: string | null;
  publishedAt: string | null;
  externalPostId: string | null;
  permalink: string | null;
}

/** Uploads the finished video, wraps it in a Content record, then schedules
 * a PublishingJob for it - the backend's social-publish worker actually
 * posts to Meta when scheduledAt arrives (see SocialPublishProcessor). */
export async function schedulePost(input: {
  organizationId: string;
  workspaceId: string;
  videoBlob: Blob;
  caption: string;
  platform: SocialPlatform;
  scheduledAt: string;
}): Promise<PublishingJob> {
  const uploaded = await uploadVideoBlob(input.videoBlob, `lumora-video-${Date.now()}.mp4`);
  const { url } = uploaded;

  const content = await apiRequest<{ id: string }>('/content', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      title: input.caption.slice(0, 100) || 'Lumora video',
      body: input.caption,
      type: 'video',
      aiGenerated: true,
      metadata: { videoUrl: url, caption: input.caption },
    }),
  });

  return apiRequest<PublishingJob>('/publishing/jobs', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      contentId: content.id,
      platform: input.platform,
      scheduledAt: input.scheduledAt,
    }),
  });
}

export async function listScheduledPosts(): Promise<PublishingJob[]> {
  const result = await apiRequest<{ items: PublishingJob[] }>('/publishing/jobs?limit=50');
  return result.items;
}

export function cancelScheduledPost(id: string): Promise<{ deleted: boolean }> {
  return apiRequest(`/publishing/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export interface ContentItem {
  id: string;
  title: string;
  body: string;
  type: string;
  metadata: { videoUrl?: string; caption?: string } | null;
}

/** Backs the real Content Calendar view - joined client-side with
 * listScheduledPosts() via PublishingJob.contentId, since the jobs endpoint
 * only returns the id (no embedded title/caption/videoUrl). */
export async function listContent(): Promise<ContentItem[]> {
  const result = await apiRequest<{ items: ContentItem[] }>('/content?limit=50');
  return result.items;
}

const CONTENT_TYPE_TO_PLATFORM: Record<string, string> = {
  'LinkedIn Post': 'linkedin',
  'Instagram Reel': 'instagram',
  'YouTube Video': 'youtube',
  TikTok: 'tiktok',
  'Blog Article': 'blog',
  Newsletter: 'newsletter',
  'Podcast Script': 'podcast',
  Presentation: 'presentation',
  Advertisement: 'ad',
  'Landing Page': 'landing-page',
  'Custom Format': 'other',
};

/** AI Studio's "Schedule to Calendar" - persists the generated text as real
 * Content, then a PublishingJob so it shows up in the real Content Calendar.
 * Deliberately created WITHOUT scheduledAt: SocialPublishEventsListener only
 * enqueues an auto-publish attempt when scheduledAt is set, and doing that
 * here would make this button silently go live on LinkedIn the moment a user
 * clicks "Schedule to Calendar" with no actual scheduling step in between.
 * The publish pipeline itself can now handle a LinkedIn text post (see
 * SocialPublishProcessor - it reads Content.body when there's no video), but
 * turning this into a real auto-publish action is a product decision that
 * hasn't been made yet, not a technical gap. Leaving scheduledAt unset shows
 * the post as pending/needs-manual-publishing in the Calendar until it is. */
export async function scheduleGeneratedContent(input: {
  title: string;
  body: string;
  contentType: string;
  aiProvider?: string;
}): Promise<{ content: ContentItem; job: PublishingJob }> {
  const user = await getCurrentUser();
  if (!user.organizationId || !user.workspaceId) {
    throw new ApiError(400, 'Your account is not attached to an organization workspace yet.');
  }
  const content = await apiRequest<ContentItem>('/content', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: user.organizationId,
      workspaceId: user.workspaceId,
      title: input.title.slice(0, 255) || 'AI Studio content',
      body: input.body,
      type: 'text',
      aiGenerated: true,
      aiProvider: input.aiProvider,
      metadata: { source: 'ai-studio', contentType: input.contentType },
    }),
  });
  const job = await apiRequest<PublishingJob>('/publishing/jobs', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: user.organizationId,
      workspaceId: user.workspaceId,
      contentId: content.id,
      platform: CONTENT_TYPE_TO_PLATFORM[input.contentType] ?? 'other',
    }),
  });
  return { content, job };
}

// ---------------------------------------------------------------------------
// Gallery - every generated image/voice clip is auto-saved server-side
// (see ImageService/VoiceService), so this just lists them back for reuse.
// ---------------------------------------------------------------------------

export type MediaAssetType = 'image' | 'video' | 'audio' | 'document';

export interface MediaAsset {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  type: MediaAssetType;
  prompt: string | null;
  provider: string | null;
  model: string | null;
  voiceId: string | null;
  createdAt: string;
}

export async function listMyGallery(type?: MediaAssetType, limit = 40): Promise<MediaAsset[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (type) params.set('type', type);
  const result = await apiRequest<{ items: MediaAsset[] }>(`/media/my?${params.toString()}`);
  return result.items;
}

export function deleteMediaAsset(id: string): Promise<{ deleted: boolean }> {
  return apiRequest(`/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export interface GalleryUsage {
  count: number;
  max: number;
}

/** The current user's combined image+video count against the shared
 * MAX_GALLERY_MEDIA_PER_USER cap (audio/documents don't count toward it). */
export function getGalleryUsage(): Promise<GalleryUsage> {
  return apiRequest('/media/gallery-usage');
}

/** Uploads an image/video clip directly into the user's gallery (unlike
 * uploadImageFile/uploadVideoBlob above, which just stash a file in storage
 * for a third-party API to fetch - this one creates a real, reusable
 * MediaAsset and counts against the gallery cap). */
export async function uploadToGallery(file: File): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append('file', file, file.name);
  return apiRequest<MediaAsset>('/media/upload', { method: 'POST', body: formData });
}

// ---------------------------------------------------------------------------
// Video templates - save a finished video for reuse, privately or with your
// whole team/workspace.
// ---------------------------------------------------------------------------

export type VideoTemplateVisibility = 'private' | 'team';

export interface VideoTemplate {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  aspectRatio: string;
  durationSeconds: number | null;
  visibility: VideoTemplateVisibility;
  createdBy: string | null;
  createdAt: string;
}

export async function saveVideoTemplate(input: {
  organizationId: string;
  workspaceId: string;
  title: string;
  videoBlob: Blob;
  aspectRatio: string;
  visibility: VideoTemplateVisibility;
}): Promise<VideoTemplate> {
  const uploaded = await uploadVideoBlob(input.videoBlob, `lumora-template-${Date.now()}.mp4`);
  return apiRequest<VideoTemplate>('/video-templates', {
    method: 'POST',
    body: JSON.stringify({
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      title: input.title,
      videoUrl: uploaded.url,
      storageKey: uploaded.key,
      aspectRatio: input.aspectRatio,
      visibility: input.visibility,
    }),
  });
}

export async function listVideoTemplates(): Promise<VideoTemplate[]> {
  const result = await apiRequest<{ items: VideoTemplate[] }>('/video-templates');
  return result.items;
}

export function deleteVideoTemplate(id: string): Promise<{ deleted: boolean }> {
  return apiRequest(`/video-templates/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Voice templates - save a provider + voice combo for reuse (e.g. picking it
// back up in Character/Video Studio), privately or with your whole team.
// ---------------------------------------------------------------------------

export type VoiceTemplateVisibility = 'private' | 'team';

export interface VoiceTemplate {
  id: string;
  name: string;
  provider: string;
  voiceId: string;
  language: string;
  visibility: VoiceTemplateVisibility;
  createdBy: string | null;
  createdAt: string;
}

export function saveVoiceTemplate(input: {
  organizationId: string;
  workspaceId: string;
  name: string;
  provider: string;
  voiceId: string;
  language: string;
  visibility: VoiceTemplateVisibility;
}): Promise<VoiceTemplate> {
  return apiRequest<VoiceTemplate>('/voice-templates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listVoiceTemplates(): Promise<VoiceTemplate[]> {
  const result = await apiRequest<{ items: VoiceTemplate[] }>('/voice-templates');
  return result.items;
}

export function deleteVoiceTemplate(id: string): Promise<{ deleted: boolean }> {
  return apiRequest(`/voice-templates/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
