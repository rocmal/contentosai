import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { RAW_RESPONSE_KEY } from '@common/decorators/raw-response.decorator';

interface Envelope<T> {
  success: true;
  data: T;
  meta?: PaginatedResult<unknown>['meta'];
  timestamp: string;
}

function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as PaginatedResult<unknown>).items) &&
    typeof (value as PaginatedResult<unknown>).meta === 'object'
  );
}

/**
 * Wraps every successful controller response in a consistent envelope so API
 * consumers never need to special-case shapes across endpoints. Routes
 * returning a binary payload (e.g. `audio/mpeg`) opt out via @RawResponse()
 * so the raw Buffer reaches the client untouched instead of being wrapped.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Envelope<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Envelope<T> | T> {
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isRaw) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (isPaginatedResult(data)) {
          return {
            success: true as const,
            data: data.items as unknown as T,
            meta: data.meta,
            timestamp: new Date().toISOString(),
          };
        }
        return {
          success: true as const,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
