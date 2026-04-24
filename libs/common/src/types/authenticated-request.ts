import { Request } from '@nestjs/common';

export interface AuthorizedUser {
  userId: string;
  accountId: string;
  name: string;
  roleId: string;
  roleName: string;
  organizationId: string | null;
  email?: string;
  msisdn?: string;
}

export const mockUser: AuthorizedUser = {
  userId: '123e4567-e89b-12d3-a456-426614174000',
  accountId: '123e4567-e89b-12d3-a456-426614174002',
  name: 'Test User',
  roleId: '123e4567-e89b-12d3-a456-426614174003',
  roleName: 'other',
  organizationId: '123e4567-e89b-12d3-a456-426614174004',
  email: 'example@tinytotoos.com',
};

export interface AuthorizedRequest extends Request {
  user: AuthorizedUser;
}
