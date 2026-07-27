import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { User } from '../../domain/entities/user.entity';
import {
  CreateUserData,
  IUsersRepository,
  UpdateUserData,
} from '../../domain/repositories/user-repository.interface';
import { UserModel } from './user.model';

@Injectable()
export class UsersRepository
  extends BaseRepository<UserModel, User, CreateUserData, UpdateUserData>
  implements IUsersRepository
{
  constructor(@InjectModel(UserModel) model: typeof UserModel) {
    super(model);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  protected toEntity(instance: UserModel): User {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      email: plain.email,
      passwordHash: plain.passwordHash,
      firstName: plain.firstName,
      lastName: plain.lastName,
      avatarUrl: plain.avatarUrl,
      status: plain.status,
      isEmailVerified: plain.isEmailVerified,
      emailVerifiedAt: plain.emailVerifiedAt,
      lastLoginAt: plain.lastLoginAt,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
