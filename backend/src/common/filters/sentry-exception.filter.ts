import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { Response, Request } from 'express';
import { sanitizeSentryEvent } from '../sentry/sentry.util';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const extra = sanitizeSentryEvent({
      path: request.url,
      method: request.method,
    });

    Sentry.captureException(exception, { extra });

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      response
        .status(status)
        .json(typeof payload === 'string' ? { message: payload } : payload);
      return;
    }

    response.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}
