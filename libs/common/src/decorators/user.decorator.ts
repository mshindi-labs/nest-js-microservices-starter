import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { AuthorizedUser } from '../types';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthorizedUser;
  },
);
