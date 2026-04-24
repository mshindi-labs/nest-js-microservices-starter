import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from 'generated/prisma/client';
import { PrismaService } from '@app/prisma';
import { PaginationService } from '@app/common/services/pagination/pagination.service';
import { PaginationResponse } from '@app/common/dto/paginated-response.dto';
import { raiseHttpError } from '@app/common/utils/raise-http-error';
import { normalizeMsisdn } from '@app/common/utils/functions';
import { ProfileStatusResponseDto } from './dto/profile-status-response.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
  ) {}

  async findAll(
    page?: number,
    size?: number,
    filters?: { roleId?: string; search?: string },
  ): Promise<PaginationResponse<User>> {
    try {
      return await this.paginationService.paginate({
        page,
        size,
        dataFetcher: (skip, take) =>
          this.repository.findAll(skip, take, filters),
        countFetcher: () => this.repository.count(filters),
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findById(id: string): Promise<User> {
    try {
      const user = await this.repository.findById(id);
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findByRoleId(roleId: string): Promise<User[]> {
    try {
      return await this.repository.findByRoleId(roleId);
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findByOrganizationId(organizationId: string): Promise<User[]> {
    try {
      return await this.repository.findByOrganizationId(organizationId);
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async create(dto: CreateUserDto): Promise<User> {
    try {
      let resolvedRoleId = dto.roleId;
      if (!resolvedRoleId) {
        const defaultRole = await this.prisma.roles.findFirst({
          where: { name: 'other' },
        });
        if (!defaultRole) {
          throw new BadRequestException(
            'Default role "other" not found. Please specify a roleId.',
          );
        }
        resolvedRoleId = defaultRole.id;
      } else {
        const role = await this.prisma.roles.findUnique({
          where: { id: resolvedRoleId },
        });
        if (!role) {
          throw new NotFoundException(`Role with ID ${resolvedRoleId} not found`);
        }
      }

      if (dto.organizationId) {
        const organization = await this.prisma.organization.findUnique({
          where: { id: dto.organizationId },
        });
        if (!organization) {
          throw new NotFoundException(
            `Organization with ID ${dto.organizationId} not found`,
          );
        }
      }

      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name: dto.name, avatar: dto.avatar ?? null },
          include: {
            memberships: {
              where: { deletedAt: null, isActive: true },
              include: { role: true, organization: true },
              orderBy: { joinedAt: 'asc' as const },
            },
            accounts: true,
          },
        });

        if (dto.organizationId) {
          await tx.organizationMembership.create({
            data: {
              userId: user.id,
              organizationId: dto.organizationId,
              roleId: resolvedRoleId,
            },
          });
        }

        return tx.user.findUnique({
          where: { id: user.id },
          include: {
            memberships: {
              where: { deletedAt: null, isActive: true },
              include: { role: true, organization: true },
              orderBy: { joinedAt: 'asc' as const },
            },
            accounts: true,
          },
        }) as Promise<User>;
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id, deletedAt: null },
        include: {
          memberships: {
            where: { deletedAt: null, isActive: true },
            orderBy: { joinedAt: 'asc' as const },
          },
          accounts: true,
        },
      });
      if (!existingUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      const { email, msisdn, roleId, organizationId, ...userFields } = dto;

      if (roleId) {
        const role = await this.prisma.roles.findUnique({ where: { id: roleId } });
        if (!role) {
          throw new NotFoundException(`Role with ID ${roleId} not found`);
        }
      }

      if (organizationId) {
        const organization = await this.prisma.organization.findUnique({
          where: { id: organizationId },
        });
        if (!organization) {
          throw new NotFoundException(
            `Organization with ID ${organizationId} not found`,
          );
        }
      }

      if (email) {
        const existingByEmail = await this.prisma.account.findUnique({
          where: { email },
          select: { userId: true },
        });
        if (existingByEmail && existingByEmail.userId !== id) {
          throw new ConflictException(
            `Email ${email} is already in use by another account`,
          );
        }
      }

      if (msisdn) {
        const normalizedMsisdn = normalizeMsisdn(msisdn);
        const existingByMsisdn = await this.prisma.account.findUnique({
          where: { msisdn: normalizedMsisdn },
          select: { userId: true },
        });
        if (existingByMsisdn && existingByMsisdn.userId !== id) {
          throw new ConflictException(
            `Phone number ${normalizedMsisdn} is already in use by another account`,
          );
        }
      }

      const accounts = existingUser.accounts ?? [];
      if (
        (email !== undefined || msisdn !== undefined) &&
        accounts.length === 0
      ) {
        throw new BadRequestException(
          'User has no account. Cannot update email or msisdn.',
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        if (Object.keys(userFields).length > 0) {
          await tx.user.update({ where: { id }, data: userFields });
        }

        const accountToUpdate = accounts[0];
        const accountUpdateData: { email?: string; msisdn?: string } = {};
        if (email !== undefined) accountUpdateData.email = email;
        if (msisdn !== undefined)
          accountUpdateData.msisdn = normalizeMsisdn(msisdn);
        if (Object.keys(accountUpdateData).length > 0 && accountToUpdate) {
          await tx.account.update({
            where: { id: accountToUpdate.id },
            data: accountUpdateData,
          });
        }

        if (roleId || organizationId) {
          const targetOrgId =
            organizationId ??
            existingUser.memberships[0]?.organizationId ??
            null;
          if (targetOrgId) {
            await tx.organizationMembership.upsert({
              where: { userId_organizationId: { userId: id, organizationId: targetOrgId } },
              create: {
                userId: id,
                organizationId: targetOrgId,
                roleId: roleId ?? existingUser.memberships[0]?.roleId ?? '',
              },
              update: {
                ...(roleId ? { roleId } : {}),
                isActive: true,
                deletedAt: null,
              },
            });
          } else if (roleId && existingUser.memberships.length > 0) {
            await tx.organizationMembership.update({
              where: { id: existingUser.memberships[0].id },
              data: { roleId },
            });
          }
        }

        return tx.user.findUnique({
          where: { id },
          include: {
            memberships: {
              where: { deletedAt: null, isActive: true },
              include: { role: true, organization: true },
              orderBy: { joinedAt: 'asc' as const },
            },
            accounts: true,
          },
        }) as Promise<User>;
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async checkProfileStatus(userId: string): Promise<ProfileStatusResponseDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId, deletedAt: null },
        include: {
          memberships: {
            where: { deletedAt: null, isActive: true },
            include: { role: true },
            orderBy: { joinedAt: 'asc' as const },
          },
          accounts: { select: { msisdn: true } },
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const msisdn = user.accounts.find((a) => a.msisdn)?.msisdn ?? null;
      const hasDefaultName = msisdn !== null && user.name === msisdn;
      const hasDefaultRole = user.memberships[0]?.role?.name === 'other';

      return {
        isProfileComplete: !hasDefaultName && !hasDefaultRole,
        hasDefaultName,
        hasDefaultRole,
      };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.findById(id);
      await this.repository.delete(id);
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async getUserMemberships(userId: string): Promise<unknown[]> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId, deletedAt: null },
        select: {
          memberships: {
            where: { deletedAt: null, isActive: true },
            include: { role: true, organization: true },
            orderBy: { joinedAt: 'asc' as const },
          },
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      return user.memberships;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async removeFromOrganization(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const membership = await this.prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId, organizationId } },
      });

      if (!membership || membership.deletedAt !== null) {
        throw new NotFoundException(
          `Membership for user ${userId} in organization ${organizationId} not found`,
        );
      }

      await this.prisma.organizationMembership.update({
        where: { userId_organizationId: { userId, organizationId } },
        data: { deletedAt: new Date(), isActive: false },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }
}
