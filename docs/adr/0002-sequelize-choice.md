# 2. Use Sequelize (via sequelize-typescript) as the ORM

## Status

Accepted

## Context

The backend needs an ORM/query layer for MySQL in development, with a planned
future migration to PostgreSQL (see ADR 0004). Candidates considered were
TypeORM, Prisma, and Sequelize with `sequelize-typescript` decorators. The
project also requires:

- schema changes tracked as explicit, reversible migrations rather than
  runtime `sync()`, so production schema changes are reviewable and safe,
- a mature `sequelize-cli` migration/seeder toolchain that a modular monolith
  with 24+ tables can rely on,
- decorator-based model definitions that map cleanly onto the Clean
  Architecture layering from ADR 0001, so a model is purely an
  infrastructure-layer concern.

## Decision

We use `sequelize` + `@nestjs/sequelize` + `sequelize-typescript` for
persistence, with `sequelize-cli` driving migrations and seeders.

- Every table has a matching migration file under
  `src/database/migrations/<timestamp>-create-<table>.js`, generated with
  `npm run migration:generate`. `queryInterface.sync()`/`Model.sync()` is
  never used — schema only changes through migrations, in test, staging, and
  production alike.
- Every persistence model lives in a module's
  `infrastructure/persistence/*.model.ts` and extends a shared `BaseModel`
  (`src/database/base.model.ts`) that provides the standard audit columns
  (`id`, `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`,
  `version`) and paranoid (soft-delete) behavior.
- Application services never import a Sequelize model or the `sequelize`
  package directly — they depend on a repository interface (ADR 0001), and
  only the matching `infrastructure/persistence/*.repository.ts` file talks
  to Sequelize.
- `DatabaseModule` (`src/database/database.module.ts`) is the single place
  the connection is configured (`SequelizeModule.forRootAsync`), resolving
  dialect/host/credentials from `ConfigService` so the same code works
  against MySQL now and PostgreSQL later.

## Consequences

- Migrations are the only source of truth for schema; `synchronize: false` is
  set explicitly in `DatabaseModule`, and CI/CD always runs
  `db:migrate` before the app boots.
- Repository implementations are the only files that need to change when we
  eventually swap dialects or, in principle, swap ORMs — domain/application
  code is unaffected.
- sequelize-typescript's decorator syntax keeps model definitions declarative
  and close to TypeORM/Prisma ergonomics while keeping full control over raw
  Sequelize query capabilities (transactions, associations, raw queries) when
  needed.
- Trade-off: Sequelize's typing is weaker than Prisma's generated client, so
  repositories are written carefully by hand with strict TypeScript (no
  `any`) to keep the type-safety guarantees the project requires.
