import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { Subscription } from '../../domain/entities/subscription.entity';
import {
  ISubscriptionsRepository,
  SUBSCRIPTIONS_REPOSITORY,
} from '../../domain/repositories/subscription-repository.interface';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { SubscriptionCreatedEvent } from '../events/subscription-created.event';

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(SUBSCRIPTIONS_REPOSITORY)
    private readonly subscriptionsRepository: ISubscriptionsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateSubscriptionDto, actorId?: string): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.create(
      {
        organizationId: dto.organizationId,
        plan: dto.plan,
        status: dto.status,
        stripeCustomerId: dto.stripeCustomerId ?? null,
        stripeSubscriptionId: dto.stripeSubscriptionId ?? null,
        currentPeriodEnd: dto.currentPeriodEnd ? new Date(dto.currentPeriodEnd) : null,
      },
      actorId,
    );

    this.eventEmitter.emit(
      'billing.created',
      new SubscriptionCreatedEvent(subscription.id, subscription.organizationId),
    );

    return subscription;
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<Subscription>> {
    return this.subscriptionsRepository.findAll(options);
  }

  async findByOrganization(organizationId: string): Promise<Subscription | null> {
    return this.subscriptionsRepository.findByOrganization(organizationId);
  }

  async findById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException(`Subscription with id "${id}" not found`);
    }
    return subscription;
  }

  async update(id: string, dto: UpdateSubscriptionDto, actorId?: string): Promise<Subscription> {
    await this.findById(id);
    return this.subscriptionsRepository.update(
      id,
      {
        plan: dto.plan,
        status: dto.status,
        stripeCustomerId: dto.stripeCustomerId,
        stripeSubscriptionId: dto.stripeSubscriptionId,
        currentPeriodEnd: dto.currentPeriodEnd ? new Date(dto.currentPeriodEnd) : undefined,
      },
      actorId,
    );
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.subscriptionsRepository.delete(id, actorId);
  }
}
