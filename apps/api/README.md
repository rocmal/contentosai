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

### Seeders

Two seeders ship in `src/database/seeders/`, run in order via `npm run db:seed`:

1. **`seed-permissions-and-roles`** - the full permission catalogue (one row per
   `<module>.<action>` slug guarded by a controller) plus two system roles: `super-admin` (every
   permission) and `member` (read access + generate/upload).
2. **`seed-demo-users-and-organization`** - a ready-to-log-in admin and normal user, plus a demo
   organization/workspace so they have somewhere to work. Idempotent - safe to re-run.

   | Role   | Email             | Password      |
   | ------ | ----------------- | ------------- |
   | Admin  | admin@lumora.ai   | Admin@12345   |
   | Member | user@lumora.ai    | User@12345    |

   **Change or remove these before deploying anywhere shared/public.**

```bash
npm run db:migrate
npm run db:seed
```

## AI / Image / Video / Voice provider architecture

Every generative capability is behind a port + factory so application code never imports a vendor
SDK directly:

- **Text**: `IAIProvider` → `AIProviderFactory` → OpenAI, Gemini, Claude, OpenRouter
- **Image**: `IImageProvider` → `ImageProviderFactory` → OpenAI Images, Stability AI, Flux
- **Video**: `IVideoProvider` (job submit/poll) → `VideoProviderFactory` → Veo, Runway, Kling, Pika, Mock (local dev)
- **Voice**: `IVoiceProvider` → `VoiceProviderFactory` → **Edge TTS (default)**, Azure, ElevenLabs, Cartesia
- **Storage**: `IStorageProvider` → `StorageProviderFactory` → Local disk, MinIO, S3

Adding a new provider means implementing the relevant interface and registering it in the
corresponding factory - no controller or service code changes.

### Voice providers (text-to-speech)

`VOICE_PROVIDER` (default `edge`) picks the provider used when a request doesn't specify one
explicitly; `VoiceProviderFactory.getProvider(name?)` falls back to it exactly like
`AIProviderFactory` does for `AI_DEFAULT_PROVIDER`.

- **Edge TTS (default)** - talks to the free, keyless text-to-speech service behind Microsoft
  Edge's "Read Aloud" feature over a WebSocket (via the [`msedge-tts`](https://www.npmjs.com/package/msedge-tts)
  package). No Azure account, no API key, no billing - this is what makes Voice Studio work out of
  the box in local development. Audio is synthesized straight into memory and never touches disk.
- **Azure Speech** - the original enterprise provider. Switch to it by setting
  `VOICE_PROVIDER=azure` plus `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION` - no code changes.
- **ElevenLabs** - set `VOICE_PROVIDER=elevenlabs` plus `ELEVENLABS_API_KEY`.
- **Cartesia** - set `VOICE_PROVIDER=cartesia` plus `CARTESIA_API_KEY`.

A request can still override the default per-call with `{ "provider": "azure", ... }` in the body,
regardless of what `VOICE_PROVIDER` is set to.

`POST /api/v1/voice/generate` returns **raw `audio/mpeg` bytes** (via Nest's `StreamableFile`, not
the standard JSON envelope - see `@RawResponse()` in `common/decorators`, which
`TransformInterceptor` checks before wrapping a response). `GET /voice/providers/status` reports
per-provider `healthCheck()` results (Edge is always configured; the others report whether their
API key is set); `GET /voice/voices?provider=edge` lists that provider's available voices.

## Scheduled/automated social publishing (Facebook & Instagram)

Video Studio's "Schedule Post" flow needs a real Meta (Facebook/Instagram) integration - this is
a distinct system from the AI/Image/Video/Voice provider abstractions above, since it publishes
*outward* to a third party rather than generating content.

**How it works:**

1. A user connects their Facebook Page (and its linked Instagram Business account, if any) once
   via `GET /api/v1/integrations/meta/connect` → Meta's OAuth dialog → `GET
   /api/v1/integrations/meta/callback` (public - Meta calls this directly). The resulting page
   access token is encrypted at rest (`EncryptionService`, same as every other `Integration` row)
   and upserted per workspace+provider (`IntegrationsService.connect`).
2. Scheduling a post (`POST /api/v1/publishing/jobs` with a future `scheduledAt`) emits the
   existing `publishing.created` domain event; `SocialPublishEventsListener`
   (`src/queues/listeners`) turns that into a delayed BullMQ job on the `social-publish` queue.
3. When the delay elapses, `SocialPublishProcessor` loads the job, the workspace's decrypted Meta
   credentials, and the content's stored video URL, then calls `SocialPublisherFactory.getPublisher
   ('facebook' | 'instagram')` - `FacebookPublisherProvider` posts directly; `InstagramPublisherProvider`
   runs Instagram's 3-step container → poll → publish dance. Same Interface → Provider → Factory
   pattern as every other generative provider in this codebase.

**Setup required (cannot be done from code):**

- Create a Meta Developer App at developers.facebook.com, add the **Facebook Login** and
  **Instagram Graph API** products.
- Request `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`,
  `instagram_content_publish`, `business_management` permissions - these require **App Review**
  and a verified **Meta Business** account before they work for anyone other than the app's own
  Meta developer/tester accounts.
- Set `META_APP_ID`, `META_APP_SECRET`, and `META_REDIRECT_URI` (must exactly match a redirect URI
  registered on the Meta app - `<APP_URL>/api/v1/integrations/meta/callback`; Meta requires HTTPS,
  so local development needs a tunnel, e.g. `ngrok http 3001`).
- The video URL a `PublishingJob` points at must be fetchable by Meta's servers over plain HTTPS -
  a `local` `StorageProvider` URL pointing at `localhost` will not work; use `s3`/`minio` in any
  environment where real Meta publishing needs to succeed, or tunnel local storage for testing.

Until `META_APP_ID`/`META_APP_SECRET`/`META_REDIRECT_URI` are set, `/integrations/meta/connect`
returns a clear `503 Service Unavailable` rather than silently failing - every other part of the
app (including scheduling itself) works without them configured.

## Background jobs

BullMQ (Redis-backed) workers live in `src/queues/`:

- **Email worker** sends verification/password-reset emails (bridged from domain events)
- **AI worker** runs background/batch content generation
- **Video worker** polls asynchronous video-generation jobs until completion
- **Analytics worker** ingests tracked events
- **Social-publish worker** fires a scheduled `PublishingJob` at its `scheduledAt` time via the
  Meta Graph API (see "Scheduled/automated social publishing" above)

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
