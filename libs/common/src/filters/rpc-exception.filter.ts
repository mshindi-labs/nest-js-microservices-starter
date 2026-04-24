import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const error = exception.getError();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (error instanceof HttpException) {
      status = error.getStatus();
      const res = error.getResponse();
      message =
        typeof res === 'string' ? res : (res as { message: string }).message;
    } else if (typeof error === 'object' && error !== null) {
      const err = error as {
        statusCode?: number;
        message?: string;
        status?: number;
      };
      status = err.statusCode ?? err.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      message = err.message ?? 'Internal server error';
    } else if (typeof error === 'string') {
      message = error;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
