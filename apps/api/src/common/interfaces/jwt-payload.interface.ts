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
}
