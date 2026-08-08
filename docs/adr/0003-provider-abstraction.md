# 3. Abstract third-party providers behind Factory + Strategy interfaces

## Status

Accepted

## Context

Lumora integrates many interchangeable third-party providers across several
modules:

- AI text generation: OpenAI, Gemini, Claude, OpenRouter (`modules/ai`)
- Image generation: OpenAI Images, Stability, Flux (`modules/image`)
- Video generation: Runway, Kling, Pika, Veo (`modules/video`)
- Voice/speech: ElevenLabs, Cartesia, Azure (`modules/voice`)
- Object storage: local disk, MinIO, S3 (`modules/storage`)

Users and organizations need to pick a provider per request (or fall back to
an org/system default), new providers will be added regularly, and a vendor
outage or pricing change must not require touching application/business
logic. Hardcoding a specific SDK call inside a service would violate the
Clean Architecture boundary from ADR 0001 and make provider churn expensive.

## Decision

Each provider-backed capability is modeled as:

1. A **domain port** — an interface such as `IAIProvider`, `IImageProvider`,
   `IVideoProvider`, `IVoiceProvider`, `IStorageProvider` — that declares only
   the operations the application layer needs (e.g. `generateText`), with
   vendor-agnostic request/response shapes.
2. One **Strategy** implementation per vendor under
   `infrastructure/providers/<vendor>.provider.ts`, each implementing the
   port and owning all vendor SDK/HTTP details.
3. A **Factory** (`<X>ProviderFactory`) that is the only place providers are
   selected: it holds a `Map<string, IXProvider>` keyed by provider name,
   defaults to the configured `AI_DEFAULT_PROVIDER` / `STORAGE_PROVIDER` /
   etc. from `ConfigService` when the caller doesn't specify one, and throws a
   clear `BadRequestException` for unknown provider names.

Application services (e.g. `AiService`) depend only on the factory and the
port interface — never on a concrete `OpenAIProvider` or vendor SDK type.

## Consequences

- Adding a new AI/image/video/voice/storage vendor means adding one new
  provider class and one line in its factory's constructor — no changes to
  services, controllers, or DTOs.
- Provider selection is testable in isolation: factories can be unit tested
  with mock providers (see
  `modules/ai/infrastructure/providers/__tests__/mock-ai-provider.ts`), and
  services can be tested against a fake `IAIProvider` without any network
  calls.
- A vendor outage or API change is isolated to a single provider file; it
  cannot cascade into business logic.
- Per-request or per-organization provider overrides are a config/DTO
  concern (`model`/`provider` fields), not a code branch scattered through
  services.
