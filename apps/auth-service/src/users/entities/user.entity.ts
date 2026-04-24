import { Account, Organization, Roles, OrganizationMembership } from 'generated/prisma/client';

export interface UserEntity {
  id: string;
  name: string;
  avatar: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithRelations extends UserEntity {
  memberships?: (OrganizationMembership & {
    role?: Roles;
    organization?: Organization;
  })[];
  accounts?: Account[];
}
