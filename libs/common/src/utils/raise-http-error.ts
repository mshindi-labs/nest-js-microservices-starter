import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotAcceptableException,
  NotFoundException,
  NotImplementedException,
  PayloadTooLargeException,
  PreconditionFailedException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { inspectData } from './functions';

export interface ErrorWithMessage {
  message: string;
  response?: {
    status?: number;
    statusCode?: number;
    data?: {
      message: string;
    };
  };
}

export interface SerializedError {
  success: false;
  message: string;
  statusCode: number;
  details?: string;
}

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function isPrismaError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'meta' in error &&
    error.constructor.name === 'PrismaClientKnownRequestError'
  );
}

export function isHttpException(error: unknown): error is HttpException {
  return error instanceof HttpException;
}

export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) {
    return maybeError;
  }

  if (maybeError === null || maybeError === undefined) {
    return new Error('An unknown error occurred');
  }

  try {
    let errorMessage = 'An error occurred';

    if (typeof maybeError === 'string') {
      errorMessage = maybeError;
    } else if (
      typeof maybeError === 'number' ||
      typeof maybeError === 'boolean'
    ) {
      errorMessage = maybeError.toString();
    } else if (typeof maybeError === 'object') {
      errorMessage = JSON.stringify(maybeError);
    }

    return new Error(errorMessage);
  } catch {
    return new Error('An error occurred but could not be serialized');
  }
}

export function getErrorMessage(error: unknown): string {
  const errorObj = toErrorWithMessage(error);

  const message =
    errorObj?.response?.data?.message ||
    errorObj.message ||
    'An error occurred';

  return message;
}

export function extractStatusCode(error: unknown): number {
  if (isHttpException(error)) {
    return error.getStatus();
  }

  const errorObj = error as Record<string, unknown>;

  const statusCode =
    (errorObj?.response as Record<string, unknown>)?.status ||
    (errorObj?.response as Record<string, unknown>)?.statusCode ||
    errorObj?.statusCode ||
    errorObj?.status ||
    errorObj?.httpCode ||
    errorObj?.code;

  if (typeof statusCode === 'number' && statusCode >= 100 && statusCode < 600) {
    return statusCode;
  }

  return 500;
}

export function serializeError(error: unknown): SerializedError {
  const message = getErrorMessage(error);
  const statusCode = extractStatusCode(error);

  let details: string | undefined;
  if (isPrismaError(error)) {
    const prismaError = error as unknown as { code: string };
    details = `Prisma Error Code: ${prismaError.code}`;
  }

  return {
    success: false,
    message,
    statusCode,
    details,
  };
}

function formatFieldNames(target: unknown): string {
  if (Array.isArray(target)) {
    return target.join(', ');
  }
  if (typeof target === 'string') {
    return target;
  }
  return 'unknown fields';
}

function handlePrismaError(error: unknown): never {
  const prismaError = error as {
    code: string;
    meta?: Record<string, unknown>;
  };
  const meta = prismaError.meta || {};

  switch (prismaError.code) {
    case 'P2002': {
      const fields = formatFieldNames(meta.target);
      throw new ConflictException(
        `A record with the provided ${fields} already exists. Please use different values.`,
      );
    }

    case 'P2003': {
      const field = (meta.field_name as string) || 'unknown field';
      throw new BadRequestException(
        `Invalid reference: The ${field} you provided does not exist. Please provide a valid reference.`,
      );
    }

    case 'P2025': {
      const cause =
        (meta.cause as string) || 'The requested record does not exist';
      throw new NotFoundException(
        `Record not found: ${cause}. Please verify the ID and try again.`,
      );
    }

    case 'P2014': {
      throw new BadRequestException(
        'The change you are trying to make would violate a required relation. Please ensure all required relationships are maintained.',
      );
    }

    case 'P2015': {
      throw new NotFoundException(
        'A related record could not be found. Please verify that all referenced records exist.',
      );
    }

    case 'P2016': {
      throw new BadRequestException(
        'The query could not be interpreted. Please check your request parameters.',
      );
    }

    case 'P2021': {
      throw new InternalServerErrorException(
        'A database table is missing. Please contact support.',
      );
    }

    case 'P2022': {
      throw new InternalServerErrorException(
        'A database column is missing. Please contact support.',
      );
    }

    case 'P2023': {
      throw new BadRequestException(
        'The provided data is inconsistent. Please check your input and try again.',
      );
    }

    case 'P2024': {
      throw new InternalServerErrorException(
        'The database connection timed out. Please try again later.',
      );
    }

    default: {
      throw new InternalServerErrorException(
        `A database error occurred. Please try again or contact support if the problem persists.`,
      );
    }
  }
}

function throwHttpExceptionByStatusCode(
  statusCode: number,
  message: string,
): never {
  switch (statusCode) {
    case 400:
      throw new BadRequestException(message);
    case 401:
      throw new UnauthorizedException(message);
    case 403:
      throw new ForbiddenException(message);
    case 404:
      throw new NotFoundException(message);
    case 405:
      throw new NotImplementedException(message);
    case 406:
      throw new NotAcceptableException(message);
    case 409:
      throw new ConflictException(message);
    case 412:
      throw new PreconditionFailedException(message);
    case 413:
      throw new PayloadTooLargeException(message);
    case 422:
      throw new UnprocessableEntityException(message);
    case 500:
    default:
      throw new InternalServerErrorException(message);
  }
}

export function raiseHttpError(error: unknown): never {
  inspectData({ error });
  if (isHttpException(error)) {
    throw error;
  }

  if (isPrismaError(error)) {
    handlePrismaError(error);
  }

  const { message, statusCode } = serializeError(error);

  const uniqueConstraintPattern =
    /Unique constraint failed on the fields?: \(?`?([^`)+]+)`?\)?/i;
  const duplicateKeyPattern =
    /duplicate key value violates unique constraint "?([^"]+)"?/i;

  const uniqueMatch = message.match(uniqueConstraintPattern);
  if (uniqueMatch) {
    const fields = uniqueMatch[1].replace(/[`_]/g, ' ').trim();
    throw new ConflictException(
      `A record with the provided ${fields} already exists. Please use different values.`,
    );
  }

  const duplicateMatch = message.match(duplicateKeyPattern);
  if (duplicateMatch) {
    const constraint = duplicateMatch[1].replace(/_/g, ' ');
    throw new ConflictException(
      `This operation violates a uniqueness constraint (${constraint}). Please use different values.`,
    );
  }

  throwHttpExceptionByStatusCode(statusCode, message);
}
