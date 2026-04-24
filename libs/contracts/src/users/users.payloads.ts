import type { AuthContext } from '../auth/auth.payloads';

export interface FindAllUsersPayload {
  readonly page?: number;
  readonly size?: number;
  readonly role_id?: number;
  readonly search?: string;
}

export interface FindUserByIdPayload {
  readonly id: number;
}

export interface UserProfileStatusPayload {
  readonly userId: number;
}

export interface CreateUserPayload {
  readonly name: string;
  readonly avatar?: string;
  readonly roleId?: number;
  readonly organizationId?: number;
  readonly context: AuthContext;
}

export interface UpdateUserPayload {
  readonly id: number;
  readonly name?: string;
  readonly avatar?: string;
  readonly roleId?: number;
  readonly organizationId?: number;
  readonly email?: string;
  readonly msisdn?: string;
  readonly context: AuthContext;
}

export interface DeleteUserPayload {
  readonly id: number;
  readonly context: AuthContext;
}
