import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

/**
 * Structured logging via Pino with correlation IDs. In non-production
 * environments logs are pretty-printed for readability; in production they
 * are emitted as raw JSON for ingestion by log aggregators.
 */
export function buildPinoHttpOptions(config: ConfigService): Params {
  const isProduction = config.get<boolean>('app.isProduction');

  return {
    pinoHttp: {
      level: isProduction ? 'info' : 'debug',
      genReqId: (req: IncomingMessage & { correlationId?: string }) =>
        req.correlationId ?? randomUUID(),
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: { colorize: true, singleLine: true, translateTime: 'SYS:standard' },
          },
      customProps: () => ({ context: 'HTTP' }),
    },
  };
}
