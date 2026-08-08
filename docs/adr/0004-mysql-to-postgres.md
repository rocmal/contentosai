# 4. Start on MySQL, design for a future move to PostgreSQL

## Status

Accepted

## Context

MySQL 8.4 is the team's current operational default (familiarity, existing
tooling, `docker-compose.yml` already provisions it for local development).
However, Lumora's roadmap — heavier JSON querying for brand/AI metadata,
full-text search, and potential read-replica/analytics workloads — makes
PostgreSQL a likely destination as the platform matures. We don't want a
day-one commitment to MySQL to make that move expensive later.

## Decision

- MySQL is the database for local development, CI, and the initial
  production deployment (`DB_DIALECT=mysql` by default in
  `.env.example` and `env.validation.ts`).
- PostgreSQL is treated as a first-class future target, not a hypothetical:
  `DB_DIALECT` is validated as `'mysql' | 'postgres'` in
  `src/config/env.validation.ts`, and `DatabaseModule` resolves the dialect
  purely from config (`config.get<string>('database.dialect')`) — there is no
  MySQL-specific code path baked into `DatabaseModule` itself.
- To keep the switch viable, module authors are expected to:
  - avoid MySQL-only SQL functions/features in migrations and raw queries,
  - use Sequelize's cross-dialect column types (`DataType.UUID`,
    `DataType.JSON`, `DataType.TEXT`, etc.) rather than MySQL-specific types,
  - keep all schema changes in `sequelize-cli` migrations (ADR 0002), which
    Sequelize can replay against either dialect,
  - avoid vendor lock-in in repository implementations — no raw MySQL-only
    queries outside of narrowly justified, documented exceptions.
- `mysql2` is a direct dependency today; `pg`/`pg-hstore` are not yet
  installed and will be added when the migration is actually scheduled, to
  avoid carrying an unused dependency.

## Consequences

- Switching environments (e.g. a staging Postgres instance) should, in the
  common case, be a configuration change (`DB_DIALECT=postgres` plus adding
  the `pg` driver) rather than a rewrite.
- Code review should flag any migration or repository method that leans on
  MySQL-specific syntax, since it silently narrows our options later.
- We accept some short-term caution/overhead (occasionally writing slightly
  more portable SQL than strictly necessary) in exchange for not having to
  do a risky, big-bang rewrite when the Postgres move actually happens.
- This ADR does not commit to a timeline for the Postgres migration — it
  only commits to not making that migration harder than it needs to be.
