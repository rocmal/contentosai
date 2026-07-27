import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ParseUUIDPipe } from '@nestjs/common';

/**
 * Thin wrapper around Nest's ParseUUIDPipe pinned to UUID v4, used on every
 * `:id` route param since all primary keys are UUIDv4.
 */
@Injectable()
export class ParseUuidParamPipe implements PipeTransform {
  private readonly delegate = new ParseUUIDPipe({ version: '4' });

  transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    return this.delegate.transform(value, metadata);
  }
}
