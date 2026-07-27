export interface FindAllOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, unknown>;
  withDeleted?: boolean;
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Port implemented by every repository adapter. Application services depend only on
 * this contract, never on the ORM - keeps business logic infrastructure-agnostic.
 */
export interface IBaseRepository<TEntity, TCreate = Partial<TEntity>, TUpdate = Partial<TEntity>> {
  findById(id: string, options?: { withDeleted?: boolean }): Promise<TEntity | null>;
  findOne(filters: Record<string, unknown>): Promise<TEntity | null>;
  findAll(options?: FindAllOptions): Promise<PaginatedResult<TEntity>>;
  create(data: TCreate, actorId?: string): Promise<TEntity>;
  update(id: string, data: TUpdate, actorId?: string): Promise<TEntity>;
  delete(id: string, actorId?: string): Promise<void>;
  restore(id: string): Promise<TEntity>;
  count(filters?: Record<string, unknown>): Promise<number>;
}
