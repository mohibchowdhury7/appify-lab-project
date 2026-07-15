import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = undefined;

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Too Many Requests';
      error = 'Too Many Requests';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        const body = responseBody as any;
        message = body.message || exception.message;

        if (Array.isArray(body.message)) {
          // class-validator errors
          details = body.message;
          message = 'Validation failed';
        }

        error = body.error || this.statusToError(status);
      }
    } else {
      console.error('[GlobalExceptionFilter] Unhandled error:', exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      ...(details ? { details } : {}),
    });
  }

  private statusToError(status: number): string {
    const map: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      429: 'Too Many Requests',
    };
    return map[status] || 'Internal Server Error';
  }
}
