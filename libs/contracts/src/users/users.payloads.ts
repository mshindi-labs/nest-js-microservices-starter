import type { AuthContext } from '../auth/auth.payloads';

export interface FindAllUsersPayload {
  readonly page?: number;
  readonly size?: number;
  readonly role_id?: string;
  readonly search?: string;
}

export interface FindUserByIdPayload {
  readonly id: string;
}

export interface UserProfileStatusPayload {
  readonly userId: string;
}

export interface CreateUserPayload {
  readonly name: string;
  readonly avatar?: string;
  readonly roleId?: string;
  readonly organizationId?: string;
  readonly context: AuthContext;
}

export interface UpdateUserPayload {
  readonly id: string;
  readonly name?: string;
  readonly avatar?: string;
  readonly roleId?: string;
  readonly organizationId?: string;
  readonly email?: string;
  readonly msisdn?: string;
  readonly context: AuthContext;
}

export interface DeleteUserPayload {
  readonly id: string;
  readonly context: AuthContext;
}

export interface GetMembershipsPayload {
  readonly userId: string;
  readonly context: AuthContext;
}

export interface RemoveFromOrgPayload {
  readonly userId: string;
  readonly organizationId: string;
  readonly context: AuthContext;
}
