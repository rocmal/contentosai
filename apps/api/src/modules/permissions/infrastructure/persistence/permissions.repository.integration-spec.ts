import { Sequelize } from 'sequelize-typescript';
import { createTestSequelize } from '@database/test-utils/sequelize-test.helper';
import { PermissionModel } from './permission.model';
import { PermissionsRepository } from './permissions.repository';

describe('PermissionsRepository (integration)', () => {
  let sequelize: Sequelize;
  let repository: PermissionsRepository;

  beforeAll(async () => {
    sequelize = createTestSequelize([PermissionModel]);
    await sequelize.authenticate();
    repository = new PermissionsRepository(PermissionModel);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await PermissionModel.destroy({ where: {}, force: true });
  });

  it('creates a permission and retrieves it by slug', async () => {
    const created = await repository.create({
      name: 'Read Campaigns',
      slug: 'campaigns.read.integration-test',
      module: 'campaigns',
    });

    const found = await repository.findBySlug('campaigns.read.integration-test');

    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.version).toBe(0);
  });

  it('paginates results via findAll', async () => {
    await repository.create({ name: 'A', slug: 'a.integration-test', module: 'test' });
    await repository.create({ name: 'B', slug: 'b.integration-test', module: 'test' });
    await repository.create({ name: 'C', slug: 'c.integration-test', module: 'test' });

    const page = await repository.findAll({ page: 1, limit: 2, filters: { module: 'test' } });

    expect(page.items).toHaveLength(2);
    expect(page.meta.totalItems).toBe(3);
    expect(page.meta.totalPages).toBe(2);
  });

  it('soft-deletes on delete() and excludes it from default lookups', async () => {
    const created = await repository.create({
      name: 'Temp',
      slug: 'temp.integration-test',
      module: 'temp',
    });

    await repository.delete(created.id);

    expect(await repository.findById(created.id)).toBeNull();
    expect(await repository.findById(created.id, { withDeleted: true })).not.toBeNull();
  });

  it('increments the optimistic-locking version column on update', async () => {
    const created = await repository.create({
      name: 'Versioned',
      slug: 'versioned.integration-test',
      module: 'test',
    });

    const updated = await repository.update(created.id, { name: 'Versioned v2' });

    expect(updated.version).toBe(created.version + 1);
  });
});
