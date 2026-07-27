import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { User, UserStatus } from '../entities/user.entity';

export interface CreateUserData {
  email: string;
  passwordHash?: string | null;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  status?: UserStatus;
}

export type UpdateUserData = Partial<
  CreateUserData & {
    isEmailVerified: boolean;
    emailVerifiedAt: Date | null;
    lastLoginAt: Date | null;
  }
>;

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface IUsersRepository extends IBaseRepository<User, CreateUserData, UpdateUserData> {
  findByEmail(email: string): Promise<User | null>;
}
