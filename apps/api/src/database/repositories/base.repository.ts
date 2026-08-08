import { NotFoundException } from '@nestjs/common';
import { Model, ModelStatic, Order, Transaction, WhereOptions } from 'sequelize';
import {
  FindAllOptions,
  IBaseRepository,
  PaginatedResult,
} from '@shared/interfaces/base-repository.interface';

/**
 * Infrastructure-layer adapter shared by every repository implementation.
 * Concrete repositories inject a Sequelize model and implement `toEntity` to
 * map persistence rows to plain domain entities - the ORM model type never
 * escapes this class.
 */
export abstract class BaseRepository<
  TModel extends Model,
  TEntity,
  TCreate = Partial<TEntity>,
  TUpdate = Partial<TEntity>,
> implements IBaseRepository<TEntity, TCreate, TUpdate> {
  protected constructor(protected readonly model: ModelStatic<TModel>) {}

  protected abstract toEntity(instance: TModel): TEntity;

  protected get entityName(): string {
    return this.model.name;
  }

  async findById(id: string, options?: { withDeleted?: boolean }): Promise<TEntity | null> {
    const instance = await this.model.findByPk(id, { paranoid: !options?.withDeleted });
    return instance ? this.toEntity(instance) : null;
  }

  async findOne(filters: Record<string, unknown>): Promise<TEntity | null> {
    const instance = await this.model.findOne({ where: filters as WhereOptions });
    return instance ? this.toEntity(instance) : null;
  }

  async findAll(options: FindAllOptions = {}): Promise<PaginatedResult<TEntity>> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 20;
    const order: Order = options.sortBy
      ? [[options.sortBy, options.sortOrder ?? 'ASC']]
      : [['createdAt', 'DESC']];

    const { rows, count } = await this.model.findAndCountAll({
      where: (options.filters ?? {}) as WhereOptions,
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

  async create(data: TCreate, actorId?: string, transaction?: Transaction): Promise<TEntity> {
    const payload = {
      ...(data as Record<string, unknown>),
      createdBy: actorId ?? null,
      updatedBy: actorId ?? null,
    };
    const instance = await this.model.create(payload as never, { transaction });
    return this.toEntity(instance);
  }

  async update(
    id: string,
    data: TUpdate,
    actorId?: string,
    transaction?: Transaction,
  ): Promise<TEntity> {
    const instance = await this.model.findByPk(id, { transaction });
    if (!instance) {
      throw new NotFoundException(`${this.entityName} with id "${id}" not found`);
    }
    // Callers pass partial DTOs where an omitted field is `undefined`, not
    // absent - spreading those into set() explicitly assigns `undefined` to
    // that attribute (clearing it), which fails validation for any
    // allowNull:false column the caller didn't intend to touch. Only apply
    // keys the caller actually provided.
    const definedData = Object.fromEntries(
      Object.entries(data as Record<string, unknown>).filter(([, value]) => value !== undefined),
    );
    instance.set({ ...definedData, updatedBy: actorId ?? null } as never);
    await instance.save({ transaction });
    return this.toEntity(instance);
  }

  async delete(id: string, actorId?: string, transaction?: Transaction): Promise<void> {
    const instance = await this.model.findByPk(id, { transaction });
    if (!instance) {
      throw new NotFoundException(`${this.entityName} with id "${id}" not found`);
    }
    if (actorId) {
      instance.set({ updatedBy: actorId } as never);
      await instance.save({ transaction });
    }
    await instance.destroy({ transaction });
  }

  async restore(id: string): Promise<TEntity> {
    const instance = await this.model.findByPk(id, { paranoid: false });
    if (!instance) {
      throw new NotFoundException(`${this.entityName} with id "${id}" not found`);
    }
    await instance.restore();
    return this.toEntity(instance);
  }

  async count(filters: Record<string, unknown> = {}): Promise<number> {
    return this.model.count({ where: filters as WhereOptions });
  }
}
