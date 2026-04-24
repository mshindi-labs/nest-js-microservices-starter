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
    filters?: { roleId?: number; search?: string },
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

  async findById(id: number): Promise<User> {
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

  async findByRoleId(roleId: number): Promise<User[]> {
    try {
      return await this.repository.findByRoleId(roleId);
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findByOrganizationId(organizationId: number): Promise<User[]> {
    try {
      return await this.repository.findByOrganizationId(organizationId);
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async create(dto: CreateUserDto): Promise<User> {
    try {
      let roleId = dto.roleId;
      if (!roleId) {
        const defaultRole = await this.prisma.roles.findFirst({
          where: { name: 'other' },
        });
        if (!defaultRole) {
          throw new BadRequestException(
            'Default role "other" not found. Please specify a roleId.',
          );
        }
        roleId = defaultRole.id;
      }

      const role = await this.prisma.roles.findUnique({
        where: { id: roleId },
      });
      if (!role) {
        throw new NotFoundException(`Role with ID ${roleId} not found`);
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

      return await this.repository.create({ ...dto, roleId });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
        include: { role: true, accounts: true, organization: true },
      });
      if (!existingUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      if (dto.roleId) {
        const role = await this.prisma.roles.findUnique({
          where: { id: dto.roleId },
        });
        if (!role) {
          throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
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

      const { email, msisdn, ...userFields } = dto;

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

      const accountToUpdate = accounts[0];
      const accountUpdateData: { email?: string; msisdn?: string } = {};
      if (email !== undefined) accountUpdateData.email = email;
      if (msisdn !== undefined)
        accountUpdateData.msisdn = normalizeMsisdn(msisdn);

      if (Object.keys(accountUpdateData).length > 0) {
        return await this.prisma.$transaction(async (tx) => {
          if (Object.keys(userFields).length > 0) {
            await tx.user.update({ where: { id }, data: userFields });
          }
          await tx.account.update({
            where: { id: accountToUpdate.id },
            data: accountUpdateData,
          });
          const updatedUser = await tx.user.findUnique({
            where: { id },
            include: { role: true, accounts: true, organization: true },
          });
          if (!updatedUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
          }
          return updatedUser;
        });
      }

      return await this.repository.update(id, userFields);
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async checkProfileStatus(userId: number): Promise<ProfileStatusResponseDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          accounts: { select: { msisdn: true } },
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const msisdn = user.accounts.find((a) => a.msisdn)?.msisdn ?? null;
      const hasDefaultName = msisdn !== null && user.name === msisdn;
      const hasDefaultRole = user.role.name === 'other';

      return {
        isProfileComplete: !hasDefaultName && !hasDefaultRole,
        hasDefaultName,
        hasDefaultRole,
      };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.findById(id);
      await this.repository.delete(id);
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }
}
