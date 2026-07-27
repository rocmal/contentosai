import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserModel } from './infrastructure/persistence/user.model';
import { UsersRepository } from './infrastructure/persistence/users.repository';
import { USERS_REPOSITORY } from './domain/repositories/user-repository.interface';
import { UsersService } from './application/services/users.service';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [SequelizeModule.forFeature([UserModel])],
  controllers: [UsersController],
  providers: [UsersService, { provide: USERS_REPOSITORY, useClass: UsersRepository }],
  exports: [UsersService, USERS_REPOSITORY],
})
export class UsersModule {}
