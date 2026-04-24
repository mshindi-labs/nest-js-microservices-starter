import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PaginationService } from '@app/common/services/pagination/pagination.service';
import type { PaginationResponse } from '@app/common/dto/paginated-response.dto';
import { raiseHttpError } from '@app/common/utils/raise-http-error';
import type { Roles } from 'generated/prisma/client';
import { RolesRepository } from './roles.repository';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly repository: RolesRepository,
    private readonly paginationService: PaginationService,
  ) {}

  async findAll(
    organizationId: string,
    page?: number,
    size?: number,
  ): Promise<PaginationResponse<Roles>> {
    try {
      return await this.paginationService.paginate({
        page,
        size,
        dataFetcher: (skip, take) =>
          this.repository.findAll(organizationId, skip, take),
        countFetcher: () => this.repository.count(organizationId),
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findById(id: string, organizationId: string): Promise<Roles> {
    try {
      const role = await this.repository.findById(id);
      if (
        !role ||
        (role.organizationId !== null && role.organizationId !== organizationId)
      ) {
        throw new NotFoundException(
          `Role with ID ${id} not found in this organization`,
        );
      }
      return role;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async create(dto: CreateRoleDto, createdBy: string): Promise<Roles> {
    try {
      const orgId = dto.organizationId ?? null;
      const existing = await this.repository.findByNameAndOrg(dto.name, orgId);
      if (existing) {
        const scope = orgId === null ? 'System role' : 'Role';
        throw new ConflictException(
          `${scope} with name "${dto.name}" already exists`,
        );
      }
      return await this.repository.create({
        name: dto.name,
        organizationId: orgId,
        createdBy,
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateRoleDto,
    updatedBy: string,
  ): Promise<Roles> {
    try {
      const role = await this.findById(id, organizationId);

      if (dto.name && dto.name !== role.name) {
        const conflict = await this.repository.findByNameAndOrg(
          dto.name,
          role.organizationId,
        );
        if (conflict) {
          throw new ConflictException(
            `Role with name "${dto.name}" already exists`,
          );
        }
      }

      return await this.repository.update(id, { name: dto.name, updatedBy });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      await this.findById(id, organizationId);

      const memberCount = await this.repository.countMemberships(id);
      if (memberCount > 0) {
        throw new ConflictException(
          `Cannot delete role: it has ${memberCount} active member(s). Reassign members first.`,
        );
      }

      const invitationCount = await this.repository.countPendingInvitations(id);
      if (invitationCount > 0) {
        throw new ConflictException(
          `Cannot delete role: it has ${invitationCount} pending invitation(s). Cancel or reassign invitations first.`,
        );
      }

      await this.repository.delete(id);
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }
}
