import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Order, WhereOptions } from 'sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { Notification } from '../../domain/entities/notification.entity';
import {
  CreateNotificationData,
  INotificationsRepository,
  UpdateNotificationData,
} from '../../domain/repositories/notification-repository.interface';
import { NotificationModel } from './notification.model';

@Injectable()
export class NotificationsRepository
  extends BaseRepository<
    NotificationModel,
    Notification,
    CreateNotificationData,
    UpdateNotificationData
  >
  implements INotificationsRepository
{
  constructor(@InjectModel(NotificationModel) model: typeof NotificationModel) {
    super(model);
  }

  async listByUser(
    userId: string,
    options: FindAllOptions = {},
  ): Promise<PaginatedResult<Notification>> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 20;
    const order: Order = options.sortBy
      ? [[options.sortBy, options.sortOrder ?? 'ASC']]
      : [['createdAt', 'DESC']];

    const { rows, count } = await this.model.findAndCountAll({
      where: { ...(options.filters ?? {}), userId } as WhereOptions,
      limit,
      offset: (page - 1) * limit,
      order,
      paranoid: !options.withDeleted,
    });

    return {
      items: rows.map((row) => this.toEntity(row)),
      meta: {
        totalItems: count,
        itemCount: rows.length,
        itemsPerPage: limit,
        totalPages: Math.max(1, Math.ceil(count / limit)),
        currentPage: page,
      },
    };
  }

  protected toEntity(instance: NotificationModel): Notification {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      userId: plain.userId,
      title: plain.title,
      message: plain.message,
      type: plain.type,
      readAt: plain.readAt,
      metadata: plain.metadata,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
