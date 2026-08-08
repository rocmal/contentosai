# 1. Adopt Clean / Hexagonal Architecture per module

## Status

Accepted

## Context

Lumora is an enterprise content operating system that will grow to dozens of
feature modules (auth, brand, campaigns, content, media, billing, and several
AI/generative provider integrations). Business rules need to stay stable and
testable even as we swap infrastructure — ORMs, queues, storage backends, and
third-party AI providers are all expected to change over the product's
lifetime. We need a structure that:

- keeps domain and application logic free of framework and infrastructure
  concerns,
- lets every module be tested in isolation with plain unit tests (no database,
  no HTTP server),
- gives new contributors one predictable folder shape to learn instead of one
  per module.

## Decision

Every feature module under `apps/api/src/modules/<name>` is split into four
layers, each with a single direction of dependency (outer layers depend on
inner ones, never the reverse):

- `domain/` — entities (plain TypeScript interfaces, no ORM decorators) and
  repository *interfaces* (ports). No NestJS, no Sequelize, no HTTP.
- `application/` — services (use cases), DTOs, and domain events. Services
  depend only on the repository interfaces and other application services,
  injected via `@Inject(SOME_REPOSITORY_TOKEN)` symbols rather than concrete
  classes.
- `infrastructure/` — adapters that implement the domain ports: Sequelize
  models, repository implementations, third-party provider clients, strategy
  factories.
- `presentation/` — NestJS controllers, translating HTTP requests into
  application service calls and mapping results to response DTOs.

Dependency Injection tokens (`Symbol('X_REPOSITORY')`) decouple the
application layer from any specific infrastructure implementation, so a
repository interface can be backed by Sequelize today and by any other
persistence technology later without touching a single service.

## Consequences

- Application services are unit-testable with hand-rolled `jest.Mocked<T>`
  repository doubles — no database or NestJS testing module required (see
  `organizations.service.spec.ts`, `permissions.service.spec.ts`,
  `brand-profiles.service.spec.ts`).
- Controllers stay thin: validation via DTOs + `class-validator`, permission
  checks via decorators/guards, everything else delegated to a service.
- New modules have a mechanical checklist to follow (entity → repository
  interface → Sequelize model → repository implementation → service →
  controller → DTOs → migration → tests), which keeps 20+ modules consistent.
- The cost is more files and more indirection than a typical "fat service"
  NestJS app; this is accepted as a deliberate trade-off for long-term
  testability and the ability to swap infrastructure.
