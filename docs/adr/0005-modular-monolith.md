# 5. Ship as a modular monolith, not microservices

## Status

Accepted

## Context

Lumora spans a large surface area — identity/RBAC, brand, campaigns, content,
media, analytics, automation, publishing, calendar, notifications, billing,
integrations, audit, settings, and multiple AI/generative provider
integrations. A microservices split was considered given the number of
bounded contexts, but at this stage the team is small, the domain boundaries
are still settling, and operating N independently deployed services (network
calls, distributed transactions, service discovery, N CI/CD pipelines) would
add substantial operational cost without a corresponding benefit yet.

## Decision

Lumora's backend (`apps/api`) is a single NestJS application — a modular
monolith:

- Every bounded context is a self-contained NestJS module under
  `src/modules/<name>`, following the Clean Architecture layering from ADR
  0001, with its own domain entities, repository interfaces/implementations,
  services, controllers, and DTOs.
- Modules communicate in-process either through direct service injection
  (e.g. `AuthService` depends on `UsersService`, `RolesService`) when a
  synchronous answer is needed, or through the shared domain event bus
  (`@nestjs/event-emitter`, `DomainEventsModule`) for cross-module side
  effects (e.g. `brand.created`, `auth.email-verification-requested`),
  keeping modules loosely coupled even inside one process.
- Background/async work goes through a single BullMQ-backed queue layer
  (`src/queues`) shared by the whole app, not per-module queues.
- The entire application builds and deploys as one Docker image
  (`apps/api/Dockerfile`) and one `docker-compose.yml` service, backed by one
  MySQL instance, one Redis instance, and one object store (MinIO/S3).
- Module boundaries are enforced by convention and code review (no importing
  another module's `infrastructure`/`domain` internals directly — only its
  exported service and DI tokens), so the codebase is *structured* for a
  future extraction into separate services if/when a specific module's scale
  or ownership needs demand it.

## Consequences

- One deployable artifact, one migration history, one set of environment
  variables — operationally simple for the team's current size.
- Cross-module changes (e.g. adding a field used by both `brand` and
  `campaigns`) are a single PR instead of coordinated multi-repo/service
  changes.
- Because modules are already internally layered and only communicate
  through services/events, extracting a high-traffic module (e.g.
  `ai`/`video` generation, which is naturally CPU/IO heavy) into its own
  service later is a bounded, well-understood refactor rather than a rewrite.
- The trade-off is that today all modules share fault domain, scaling
  profile, and deploy cadence — a bug or load spike in one module can affect
  the whole API process. This is accepted as appropriate for the current
  stage of the product.
