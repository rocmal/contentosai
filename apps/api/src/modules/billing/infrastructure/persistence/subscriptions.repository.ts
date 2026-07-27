import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { Subscription } from '../../domain/entities/subscription.entity';
import {
  CreateSubscriptionData,
  ISubscriptionsRepository,
  UpdateSubscriptionData,
} from '../../domain/repositories/subscription-repository.interface';
import { SubscriptionModel } from './subscription.model';

@Injectable()
export class SubscriptionsRepository
  extends BaseRepository<
    SubscriptionModel,
    Subscription,
    CreateSubscriptionData,
    UpdateSubscriptionData
  >
  implements ISubscriptionsRepository
{
  constructor(@InjectModel(SubscriptionModel) model: typeof SubscriptionModel) {
    super(model);
  }

  async findByOrganization(organizationId: string): Promise<Subscription | null> {
    return this.findOne({ organizationId });
  }

  protected toEntity(instance: SubscriptionModel): Subscription {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      plan: plain.plan,
      status: plain.status,
      stripeCustomerId: plain.stripeCustomerId,
      stripeSubscriptionId: plain.stripeSubscriptionId,
      currentPeriodEnd: plain.currentPeriodEnd,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
