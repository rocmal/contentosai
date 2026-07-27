import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginatedResult } from '@shared/interfaces/base-repository.interface';

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
 * consumers never need to special-case shapes across endpoints.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Envelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<Envelope<T>> {
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
