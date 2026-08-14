import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorCode } from '@signaldesk/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = 'INTERNAL_SERVER_ERROR';
    let message = 'An internal server error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;

        if (resObj.error && typeof resObj.error === 'object') {
          const nested = resObj.error as Record<string, unknown>;
          code = (nested.code as string) || this.getDefaultCode(statusCode);
          message = (nested.message as string) || exception.message;
          details = nested.details;
        } else {
          // Handle ValidationPipe response
          if (Array.isArray(resObj.message)) {
            code = ErrorCode.VALIDATION_ERROR;
            message = resObj.message.join(', ');
            details = resObj.message;
          } else {
            message = (resObj.message as string) || exception.message;
            code = (resObj.code as string) || this.getDefaultCode(statusCode);
            details = resObj.details;
          }
        }
      }
    } else {
      this.logger.error('Unhandled Exception:', exception);
    }

    response.status(statusCode).json({
      error: {
        code,
        message,
        statusCode,
        ...(details ? { details } : {}),
      },
    });
  }

  private getDefaultCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.CASE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CLAIM_CONFLICT;
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
