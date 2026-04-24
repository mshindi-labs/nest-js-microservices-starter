import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { applyDecorators } from '@nestjs/common';

type ClassConstructor = new (...args: unknown[]) => unknown;

interface APIResponseType {
  status: number;
  description: string;
  type?: ClassConstructor | string;
}

interface APIQueryParam {
  name: string;
  required: boolean;
  description: string;
  type: ClassConstructor | string;
}

export function APIResponsesDecorator(
  responses: APIResponseType[],
  invalidKey?: string,
  notFoundKey?: string,
) {
  const commonResponses = [
    ApiForbiddenResponse({
      description: 'Forbidden | Missing API_KEY or Authorization ',
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error',
    }),
  ];

  if (invalidKey) {
    commonResponses.push(
      ApiBadRequestResponse({ description: `Invalid ${invalidKey}` }),
    );
  }

  if (notFoundKey) {
    commonResponses.push(
      ApiNotFoundResponse({ description: `${notFoundKey} not found` }),
    );
  }

  return applyDecorators(
    ...[...commonResponses, ...responses.map((res) => ApiResponse(res))],
  );
}

const commonResponses = [
  ApiUnauthorizedResponse({
    description: 'Unauthorized | Invalid API_KEY or Authorization',
  }),
  ApiForbiddenResponse({
    description: 'Forbidden | Missing API_KEY or Authorization ',
  }),
  ApiConflictResponse({
    description: 'Conflict | Entry already exists',
  }),
  ApiUnprocessableEntityResponse({
    description: 'Unprocessable Entity | Invalid input data',
  }),
  ApiInternalServerErrorResponse({
    description: 'Internal server error',
  }),
];

export function APICreateResponsesDecorator(responses: APIResponseType[]) {
  return applyDecorators(
    ...[...commonResponses, ...responses.map((r) => ApiResponse(r))],
  );
}

export function APIGetItemsResponsesDecorator(
  modelName: string,
  dto: ClassConstructor | string,
) {
  return applyDecorators(
    ...[
      ApiOkResponse({
        description: `Returns a list of ${modelName}`,
        type: dto,
      }),
      ...commonResponses,
    ],
  );
}

export function APIQueryParamsDecorator(params: APIQueryParam[]) {
  return applyDecorators(
    ...params.map((param) => {
      return ApiQuery({
        name: param.name,
        required: param.required,
        description: param.description,
        type: param.type,
      });
    }),
  );
}
