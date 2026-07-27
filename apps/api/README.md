# Lumora API

Production backend for **Lumora**, an AI Content Operating System that lets businesses generate,
automate, publish and analyse content across multiple AI providers, from one platform.

Built with NestJS, TypeScript and Sequelize on Clean/Hexagonal Architecture: business logic never
depends on infrastructure, and the database driver can be swapped (MySQL → PostgreSQL) by changing
configuration only.

## Architecture

```
src/
  modules/            feature modules (auth, users, organizations, workspaces, roles,
                       permissions, campaigns, content, ai, image, video, voice, storage, ...)
    <feature>/
      domain/          entities (plain interfaces) + repository ports (interfaces)
      application/     DTOs, application services (use cases), domain events
      infrastructure/  Sequelize models + repository adapters, provider adapters
      presentation/    REST controllers
      <feature>.module.ts
  common/              filters, guards, interceptors, decorators, pipes, middleware, swagger, logging
  config/              @nestjs/config namespaces + Joi validation schema
  database/            Sequelize connection, base model/repository, migrations, seeders, factories
  events/              EventEmitter2 wiring + DomainEvent base class
  queues/              BullMQ wiring, workers (AI, video, analytics, email), event→queue bridges
  shared/              cross-cutting ports with no framework/vendor dependency (password hashing,
                       encryption, mailer, base entity types, repository interface)
```

Every table has: UUID primary key, `createdAt`/`updatedAt`/`deletedAt` (soft delete), `createdBy`/
`updatedBy` (audit trail) and `version` (optimistic locking via Sequelize's built-in `version: true`).
Services never inject Sequelize directly - they depend on a repository **interface**
(`I<X>Repository`, from `domain/repositories`), bound to a concrete Sequelize-backed implementation
in the module's providers array. Swapping the ORM/database only touches `infrastructure/`.

## Database portability (MySQL → PostgreSQL)

The codebase contains **zero** database-specific SQL. Switching dialects is purely configuration:

1. `npm install pg` (and remove `mysql2` if you want a lean install)
2. Set `DB_DIALECT=postgres` in your environment
3. Update `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`

No application or migration code changes are required.

## Getting started

```bash
npm install
cp .env.example .env.development
# edit .env.development with real secrets/credentials

# start MySQL + Redis + MinIO locally
docker compose up -d mysql redis minio

npm run db:migrate
npm run start:dev
```

The API listens on `http://localhost:3000/api/v1` by default; Swagger UI is served at
`http://localhost:3000/api/docs`.

## Environment files

| File               | Purpose                          |
| ------------------ | --------------------------------- |
| `.env.example`      | Documented template, safe to commit |
| `.env.development`  | Local development                 |
| `.env.staging`      | Staging deployment                 |
| `.env.production`   | Production deployment             |
| `.env.test`         | Test runs (unit/integration/e2e)  |

Every variable is validated at boot via Joi (`src/config/env.validation.ts`) - the app refuses to
start if a required variable is missing or malformed.

## Scripts

| Script                     | Description                                         |
| -------------------------- | ---------------------------------------------------- |
| `npm run start:dev`        | Run with hot reload (ts-node-dev)                    |
| `npm run build`             | Compile to `dist/` (tsc + path-alias rewrite)         |
| `npm run start:prod`        | Run the compiled build                                |
| `npm run lint`               | ESLint                                               |
| `npm test`                   | Unit tests (mocked dependencies, no external services) |
| `npm run test:integration`   | Repository tests against a real (test) database       |
| `npm run test:e2e`           | End-to-end HTTP tests via supertest                    |
| `npm run db:migrate`         | Apply pending migrations                              |
| `npm run db:migrate:undo`    | Roll back the last migration                          |
| `npm run db:seed`            | Run all seeders                                       |
| `npm run migration:generate` | Scaffold a new migration file                          |

## Database

Sequelize CLI drives schema changes exclusively via migrations - `sync()` is never called.
Migrations live in `src/database/migrations/`, seeders in `src/database/seeders/`, and the CLI
config (`src/database/config/sequelize-cli.config.js`) loads the same `.env.<APP_ENV>` file the
application itself uses, so migrations always target the right database.

```bash
APP_ENV=test npm run db:migrate        # migrate the test database
npm run migration:generate -- create-widgets
```

## AI / Image / Video / Voice provider architecture

Every generative capability is behind a port + factory so application code never imports a vendor
SDK directly:

- **Text**: `IAIProvider` → `AIProviderFactory` → OpenAI, Gemini, Claude, OpenRouter
- **Image**: `IImageProvider` → `ImageProviderFactory` → OpenAI Images, Stability AI, Flux
- **Video**: `IVideoProvider` (job submit/poll) → `VideoProviderFactory` → Veo, Runway, Kling, Pika
- **Voice**: `IVoiceProvider` → `VoiceProviderFactory` → ElevenLabs, Cartesia, Azure
- **Storage**: `IStorageProvider` → `StorageProviderFactory` → Local disk, MinIO, S3

Adding a new provider means implementing the relevant interface and registering it in the
corresponding factory - no controller or service code changes.

## Background jobs

BullMQ (Redis-backed) workers live in `src/queues/`:

- **Email worker** sends verification/password-reset emails (bridged from domain events)
- **AI worker** runs background/batch content generation
- **Video worker** polls asynchronous video-generation jobs until completion
- **Analytics worker** ingests tracked events

Domain events (EventEmitter2, `src/events/`) decouple publishers from subscribers - e.g.
`AuthService` emits `auth.email-verification-requested` with no knowledge that a queue listener
turns it into an email job.

## Authentication & authorization

JWT access + refresh tokens (rotated on refresh, revocable), email verification, forgot/reset
password, and OAuth (Google/GitHub/Microsoft - wired and ready, activate by setting the relevant
`*_CLIENT_ID`/`*_CLIENT_SECRET` env vars). RBAC is enforced via `@RequirePermissions(...)` /
`@Roles(...)` guards; permissions and roles are stored per-organization and resolved fresh from the
database on every request (so a revoked permission takes effect immediately, not only once the
access token expires).

## Multi-tenancy

`Organization` → `Workspace` → tenant-scoped resources (campaigns, content, ...). Every tenant
resource migration carries `organizationId`/`workspaceId` foreign keys.

## Testing strategy

- **Unit tests** (`*.spec.ts`): mocked repositories/services, run via `npm test` with no external
  dependencies.
- **Repository/integration tests** (`*.integration-spec.ts`): exercise a real repository against a
  migrated test database - run via `npm run test:integration` after `APP_ENV=test npm run db:migrate`.
- **E2E tests** (`test/*.e2e-spec.ts`): boot the full Nest application and exercise it over HTTP via
  supertest, run via `npm run test:e2e`.

## Docker

```bash
docker compose up -d           # api + mysql + redis + minio
docker build -t lumora-api .   # production image (multi-stage)
```
