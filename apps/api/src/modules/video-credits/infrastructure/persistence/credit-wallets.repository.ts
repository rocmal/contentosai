import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, literal } from 'sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { VideoCreditWallet } from '../../domain/entities/credit-wallet.entity';
import {
  CreateVideoCreditWalletData,
  IVideoCreditWalletsRepository,
  UpdateVideoCreditWalletData,
} from '../../domain/repositories/credit-wallet-repository.interface';
import { VideoCreditWalletModel } from './credit-wallet.model';

@Injectable()
export class VideoCreditWalletsRepository
  extends BaseRepository<
    VideoCreditWalletModel,
    VideoCreditWallet,
    CreateVideoCreditWalletData,
    UpdateVideoCreditWalletData
  >
  implements IVideoCreditWalletsRepository
{
  constructor(@InjectModel(VideoCreditWalletModel) model: typeof VideoCreditWalletModel) {
    super(model);
  }

  async findCurrent(organizationId: string, at: Date): Promise<VideoCreditWallet | null> {
    const instance = await this.model.findOne({
      where: {
        organizationId,
        periodStart: { [Op.lte]: at },
        periodEnd: { [Op.gt]: at },
      },
    });
    return instance ? this.toEntity(instance) : null;
  }

  async tryReserve(walletId: string, credits: number): Promise<boolean> {
    // The WHERE clause is the concurrency control. Two simultaneous submits
    // both pass a read-then-check; only one can pass this.
    const [affected] = await this.model.update(
      { reservedCredits: literal(`reservedCredits + ${this.asInt(credits)}`) },
      {
        where: {
          id: walletId,
          [Op.and]: literal(
            `(grantedCredits - reservedCredits - consumedCredits) >= ${this.asInt(credits)}`,
          ),
        },
      },
    );
    return affected === 1;
  }

  async commitReservation(
    walletId: string,
    reserved: number,
    actual: number,
  ): Promise<boolean> {
    const [affected] = await this.model.update(
      {
        reservedCredits: literal(`reservedCredits - ${this.asInt(reserved)}`),
        consumedCredits: literal(`consumedCredits + ${this.asInt(actual)}`),
      },
      {
        where: {
          id: walletId,
          [Op.and]: literal(`reservedCredits >= ${this.asInt(reserved)}`),
        },
      },
    );
    return affected === 1;
  }

  async releaseReservation(walletId: string, credits: number): Promise<boolean> {
    const [affected] = await this.model.update(
      { reservedCredits: literal(`reservedCredits - ${this.asInt(credits)}`) },
      {
        where: {
          id: walletId,
          [Op.and]: literal(`reservedCredits >= ${this.asInt(credits)}`),
        },
      },
    );
    return affected === 1;
  }

  /** Credits are whole numbers; this both enforces that and makes the value
   *  safe to inline into a literal, since it can only ever be digits. */
  private asInt(credits: number): number {
    if (!Number.isSafeInteger(credits) || credits < 0) {
      throw new TypeError(`Credit amounts must be non-negative integers, received ${credits}`);
    }
    return credits;
  }

  protected toEntity(instance: VideoCreditWalletModel): VideoCreditWallet {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      plan: plain.plan,
      periodStart: plain.periodStart,
      periodEnd: plain.periodEnd,
      grantedCredits: plain.grantedCredits,
      reservedCredits: plain.reservedCredits,
      consumedCredits: plain.consumedCredits,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
