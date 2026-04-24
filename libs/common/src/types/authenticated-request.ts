import { Request } from '@nestjs/common';

export interface AuthorizedUser {
  userId: number;
  accountId: string;
  name: string;
  roleId: number;
  roleName: string;
  organizationId: number | null;
  email?: string;
  msisdn?: string;
}

export const mockUser: AuthorizedUser = {
  userId: 10101,
  accountId: '123e4567-e89b-12d3-a456-426614174002',
  name: 'Test User',
  roleId: 101,
  roleName: 'other',
  organizationId: 101,
  email: 'example@tinytotoos.com',
};

export interface AuthorizedRequest extends Request {
  user: AuthorizedUser;
}
