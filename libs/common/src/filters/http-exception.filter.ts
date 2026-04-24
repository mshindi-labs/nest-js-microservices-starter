import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter<
  T extends HttpException,
> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();

    const error =
      status === 429
        ? {
            message:
              'Threshold limit exceeded, Too many requests Please try again after some time.',
          }
        : typeof response === 'string'
          ? { message: exceptionResponse }
          : (exceptionResponse as Record<string, unknown>);

    response.status(status).json({
      ...error,
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}
