import { ModelStatic, Model } from 'sequelize';

/**
 * Generic Sequelize factory used by tests and seeders to build/persist model
 * instances with sensible fake defaults, overridable per call.
 */
export class Factory<TModel extends Model, TAttrs extends object> {
  constructor(
    private readonly model: ModelStatic<TModel>,
    private readonly definition: () => TAttrs,
  ) {}

  build(overrides: Partial<TAttrs> = {}): TAttrs {
    return { ...this.definition(), ...overrides };
  }

  buildMany(count: number, overrides: Partial<TAttrs> = {}): TAttrs[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  async create(overrides: Partial<TAttrs> = {}): Promise<TModel> {
    return this.model.create(this.build(overrides) as never);
  }

  async createMany(count: number, overrides: Partial<TAttrs> = {}): Promise<TModel[]> {
    return Promise.all(Array.from({ length: count }, () => this.create(overrides)));
  }
}
