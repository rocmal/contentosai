import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError as SequelizeValidationError } from 'sequelize';

interface ErrorBody {
  success: false;
  statusCode: number;
  path: string;
  timestamp: string;
  correlationId?: string;
  message: string | string[];
  error?: string;
}

/**
 * Single place where every unhandled error in the application is normalized
 * into a consistent JSON envelope. Nothing infrastructure-specific (Sequelize
 * errors, etc.) ever reaches the client verbatim.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    const { statusCode, message, error } = this.resolveError(exception);

    const body: ErrorBody = {
      success: false,
      statusCode,
      path: request.url,
      timestamp: new Date().toISOString(),
      correlationId: request.correlationId,
      message,
      error,
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json(body);
  }

  private resolveError(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error?: string;
  } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const statusCode = exception.getStatus();
      if (typeof response === 'string') {
        return { statusCode, message: response };
      }
      const body = response as { message?: string | string[]; error?: string };
      return {
        statusCode,
        message: body.message ?? exception.message,
        error: body.error,
      };
    }

    if (exception instanceof SequelizeValidationError) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: exception.errors.map((e) => e.message),
        error: 'ValidationError',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }
}
