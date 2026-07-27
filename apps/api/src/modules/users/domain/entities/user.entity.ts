import { BaseEntity } from '@shared/domain/base.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  SUSPENDED = 'suspended',
}

export interface User extends BaseEntity {
  email: string;
  passwordHash: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  status: UserStatus;
  isEmailVerified: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
