import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { Prisma } from 'generated/prisma/client';
import { User } from 'generated/prisma/client';
import { raiseHttpError } from '@app/common/utils/raise-http-error';

export interface UsersFindAllFilters {
  roleId?: string;
  search?: string;
}

const USER_WITH_MEMBERSHIPS_INCLUDE = {
  memberships: {
    where: { deletedAt: null, isActive: true },
    include: { role: true, organization: true },
    orderBy: { joinedAt: 'asc' as const },
  },
  accounts: true,
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhereClause(
    filters?: UsersFindAllFilters,
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (filters?.roleId) {
      where.memberships = {
        some: {
          roleId: filters.roleId,
          deletedAt: null,
          isActive: true,
        },
      };
    }

    if (filters?.search?.trim()) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        {
          accounts: {
            some: {
              OR: [
                { email: { contains: searchTerm, mode: 'insensitive' } },
                { msisdn: { contains: searchTerm } },
              ],
            },
          },
        },
      ];
    }

    return where;
  }

  async findAll(
    skip?: number,
    take?: number,
    filters?: UsersFindAllFilters,
  ): Promise<User[]> {
    try {
      const where = this.buildWhereClause(filters);
      return await this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id, deletedAt: null },
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findByRoleId(roleId: string): Promise<User[]> {
    try {
      return await this.prisma.user.findMany({
        where: {
          deletedAt: null,
          memberships: { some: { roleId, deletedAt: null, isActive: true } },
        },
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findByOrganizationId(organizationId: string): Promise<User[]> {
    try {
      return await this.prisma.user.findMany({
        where: {
          deletedAt: null,
          memberships: {
            some: { organizationId, deletedAt: null, isActive: true },
          },
        },
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async create(data: { name: string; avatar?: string | null }): Promise<User> {
    try {
      return await this.prisma.user.create({
        data,
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id, deletedAt: null },
        data,
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async count(filters?: UsersFindAllFilters): Promise<number> {
    try {
      const where = this.buildWhereClause(filters);
      return await this.prisma.user.count({ where });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }
}
