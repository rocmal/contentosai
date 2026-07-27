import { Global, Module } from '@nestjs/common';

/**
 * Placeholder for cross-cutting, framework-agnostic providers shared by every
 * feature module (e.g. clock, id-generator abstractions). Kept global and empty
 * by default so feature modules can extend it without circular imports.
 */
@Global()
@Module({})
export class SharedModule {}
