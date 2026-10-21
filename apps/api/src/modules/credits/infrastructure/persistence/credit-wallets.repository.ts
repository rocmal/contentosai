import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize, Transaction } from 'sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { CreditWallet } from '../../domain/entities/credit-wallet.entity';
import {
  CreateCreditWalletData,
  ICreditWalletsRepository,
  UpdateCreditWalletData,
} from '../../domain/repositories/credit-wallet-repository.interface';
import { CreditWalletModel } from './credit-wallet.model';

@Injectable()
export class CreditWalletsRepository
  extends BaseRepository<CreditWalletModel, CreditWallet, CreateCreditWalletData, UpdateCreditWalletData>
  implements ICreditWalletsRepository
{
  constructor(
    @InjectModel(CreditWalletModel) model: typeof CreditWalletModel,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {
    super(model);
  }

  async findByWorkspace(workspaceId: string): Promise<CreditWallet | null> {
    const instance = await this.model.findOne({ where: { workspaceId } });
    return instance ? this.toEntity(instance) : null;
  }

  async tryDecrement(workspaceId: string, amount: number): Promise<CreditWallet | null> {
    return this.sequelize.transaction(async (transaction: Transaction) => {
      const instance = await this.model.findOne({
        where: { workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!instance) return null;

      // null balance = unlimited (Enterprise) - nothing to decrement, always allowed.
      if (instance.balance === null) {
        return this.toEntity(instance);
      }
      if (instance.balance < amount) {
        return null;
      }

      instance.set({ balance: instance.balance - amount } as never);
      await instance.save({ transaction });
      return this.toEntity(instance);
    });
  }

  async increment(workspaceId: string, amount: number): Promise<CreditWallet> {
    return this.sequelize.transaction(async (transaction: Transaction) => {
      const instance = await this.model.findOne({
        where: { workspaceId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!instance) {
        throw new Error(`Credit wallet for workspace "${workspaceId}" not found`);
      }
      if (instance.balance !== null) {
        instance.set({ balance: instance.balance + amount } as never);
        await instance.save({ transaction });
      }
      return this.toEntity(instance);
    });
  }

  async setBalance(
    workspaceId: string,
    balance: number | null,
    cycleStartAt: Date,
    cycleEndAt: Date | null,
  ): Promise<CreditWallet> {
    const instance = await this.model.findOne({ where: { workspaceId } });
    if (!instance) {
      throw new Error(`Credit wallet for workspace "${workspaceId}" not found`);
    }
    instance.set({ balance, cycleStartAt, cycleEndAt } as never);
    await instance.save();
    return this.toEntity(instance);
  }

  protected toEntity(instance: CreditWalletModel): CreditWallet {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      balance: plain.balance,
      cycleStartAt: plain.cycleStartAt,
      cycleEndAt: plain.cycleEndAt,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
