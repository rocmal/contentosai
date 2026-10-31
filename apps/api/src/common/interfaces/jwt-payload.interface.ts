export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string | null;
  workspaceId: string | null;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string | null;
  workspaceId: string | null;
  roles: string[];
  permissions: string[];
  /** Lumora staff (PLATFORM_ADMIN_EMAILS): may act across customers. Never set from the token - worked out from
   * the database and settings on every request. */
  isPlatformAdmin?: boolean;
}
