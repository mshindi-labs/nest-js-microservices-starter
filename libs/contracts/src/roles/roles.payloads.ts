import type { AuthContext } from '../auth/auth.payloads';

export interface CreateRolePayload {
  readonly name: string;
  readonly organizationId: string;
  readonly context: AuthContext;
}

export interface FindAllRolesPayload {
  readonly organizationId: string;
  readonly page?: number;
  readonly size?: number;
  readonly context: AuthContext;
}

export interface FindRoleByIdPayload {
  readonly id: string;
  readonly organizationId: string;
  readonly context: AuthContext;
}

export interface UpdateRolePayload {
  readonly id: string;
  readonly organizationId: string;
  readonly name?: string;
  readonly context: AuthContext;
}

export interface DeleteRolePayload {
  readonly id: string;
  readonly organizationId: string;
  readonly context: AuthContext;
}

export interface RoleResponsePayload {
  readonly id: string;
  readonly name: string;
  readonly organizationId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
