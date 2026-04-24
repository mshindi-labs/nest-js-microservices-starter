import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { Prisma } from 'generated/prisma/client';
import { User } from 'generated/prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { raiseHttpError } from '@app/common/utils/raise-http-error';

export interface UsersFindAllFilters {
  roleId?: number;
  search?: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhereClause(
    filters?: UsersFindAllFilters,
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (filters?.roleId) {
      where.roleId = filters.roleId;
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

    return Object.keys(where).length > 0 ? where : {};
  }

  async findAll(
    skip?: number,
    take?: number,
    filters?: UsersFindAllFilters,
  ): Promise<User[]> {
    try {
      const where = this.buildWhereClause(filters);
      return await this.prisma.user.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { role: true, accounts: true, organization: true },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
        include: { role: true, accounts: true, organization: true },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findByRoleId(roleId: number): Promise<User[]> {
    try {
      return await this.prisma.user.findMany({
        where: { roleId },
        include: { role: true, accounts: true, organization: true },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findByOrganizationId(organizationId: number): Promise<User[]> {
    try {
      return await this.prisma.user.findMany({
        where: { organizationId },
        include: { role: true, accounts: true, organization: true },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async create(data: CreateUserDto & { roleId: number }): Promise<User> {
    try {
      return await this.prisma.user.create({
        data,
        include: { role: true, organization: true },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async update(id: number, data: UpdateUserDto): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        include: { role: true, accounts: true, organization: true },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async count(filters?: UsersFindAllFilters): Promise<number> {
    try {
      const where = this.buildWhereClause(filters);
      return await this.prisma.user.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }
}
