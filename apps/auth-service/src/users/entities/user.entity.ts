import { Account, Organization, Roles } from 'generated/prisma/client';

export interface UserEntity {
  id: string;
  name: string;
  avatar: string | null;
  roleId: string;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithRelations extends UserEntity {
  role?: Roles;
  organization?: Organization | null;
  accounts?: Account[];
}
