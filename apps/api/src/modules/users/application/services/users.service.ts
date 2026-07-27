import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { IPasswordHasher, PASSWORD_HASHER } from '@shared/security/password-hasher.interface';
import { SafeUser, toSafeUser, User, UserStatus } from '../../domain/entities/user.entity';
import {
  IUsersRepository,
  USERS_REPOSITORY,
} from '../../domain/repositories/user-repository.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserCreatedEvent } from '../events/user-created.event';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly usersRepository: IUsersRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateUserDto, actorId?: string): Promise<SafeUser> {
    const email = dto.email.toLowerCase();
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException(`A user with email "${email}" already exists`);
    }

    const passwordHash = dto.password ? await this.passwordHasher.hash(dto.password) : null;

    const user = await this.usersRepository.create(
      {
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        status: passwordHash ? UserStatus.ACTIVE : UserStatus.INVITED,
      },
      actorId,
    );

    this.eventEmitter.emit('user.created', new UserCreatedEvent(user.id, user.email));

    return toSafeUser(user);
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<SafeUser>> {
    const result = await this.usersRepository.findAll(options);
    return { items: result.items.map(toSafeUser), meta: result.meta };
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.findEntityById(id);
    return toSafeUser(user);
  }

  async findEntityById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email.toLowerCase());
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string): Promise<SafeUser> {
    await this.findEntityById(id);
    const user = await this.usersRepository.update(id, dto, actorId);
    return toSafeUser(user);
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findEntityById(id);
    await this.usersRepository.delete(id, actorId);
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      status: UserStatus.ACTIVE,
    });
  }

  async setPassword(id: string, plainTextPassword: string): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(plainTextPassword);
    await this.usersRepository.update(id, { passwordHash, status: UserStatus.ACTIVE });
  }

  async recordLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });
  }
}
