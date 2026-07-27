import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';

export interface CreateSubscriptionData {
  organizationId: string;
  plan: string;
  status?: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
}

export type UpdateSubscriptionData = Partial<Omit<CreateSubscriptionData, 'organizationId'>>;

export const SUBSCRIPTIONS_REPOSITORY = Symbol('SUBSCRIPTIONS_REPOSITORY');

export interface ISubscriptionsRepository extends IBaseRepository<
  Subscription,
  CreateSubscriptionData,
  UpdateSubscriptionData
> {
  findByOrganization(organizationId: string): Promise<Subscription | null>;
}
