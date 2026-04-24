import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import type { Roles } from 'generated/prisma/client';
import { raiseHttpError } from '@app/common/utils/raise-http-error';
import { InvitationStatus } from 'generated/prisma/client';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    skip?: number,
    take?: number,
  ): Promise<Roles[]> {
    try {
      return await this.prisma.roles.findMany({
        where: { OR: [{ organizationId }, { organizationId: null }] },
        skip,
        take,
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findById(id: string): Promise<Roles | null> {
    try {
      return await this.prisma.roles.findUnique({ where: { id } });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findByNameAndOrg(
    name: string,
    organizationId: string | null,
  ): Promise<Roles | null> {
    try {
      return await this.prisma.roles.findFirst({
        where: { name, organizationId },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async create(data: {
    name: string;
    organizationId: string | null;
    createdBy?: string;
  }): Promise<Roles> {
    try {
      return await this.prisma.roles.create({ data });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async update(
    id: string,
    data: { name?: string; updatedBy?: string },
  ): Promise<Roles> {
    try {
      return await this.prisma.roles.update({ where: { id }, data });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async delete(id: string): Promise<Roles> {
    try {
      return await this.prisma.roles.delete({ where: { id } });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async countMemberships(roleId: string): Promise<number> {
    try {
      return await this.prisma.organizationMembership.count({
        where: { roleId, deletedAt: null, isActive: true },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async countPendingInvitations(roleId: string): Promise<number> {
    try {
      return await this.prisma.invitation.count({
        where: { roleId, status: InvitationStatus.PENDING },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async count(organizationId: string): Promise<number> {
    try {
      return await this.prisma.roles.count({
        where: { OR: [{ organizationId }, { organizationId: null }] },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }
}
