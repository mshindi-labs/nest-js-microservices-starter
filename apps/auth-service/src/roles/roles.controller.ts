import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RolesService } from './roles.service';
import { ROLES_PATTERNS } from '@app/contracts/roles/roles.patterns';
import type {
  CreateRolePayload,
  FindAllRolesPayload,
  FindRoleByIdPayload,
  UpdateRolePayload,
  DeleteRolePayload,
} from '@app/contracts/roles/roles.payloads';

@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @MessagePattern(ROLES_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: FindAllRolesPayload) {
    return this.rolesService.findAll(
      payload.organizationId,
      payload.page,
      payload.size,
    );
  }

  @MessagePattern(ROLES_PATTERNS.FIND_BY_ID)
  findById(@Payload() payload: FindRoleByIdPayload) {
    return this.rolesService.findById(payload.id, payload.organizationId);
  }

  @MessagePattern(ROLES_PATTERNS.CREATE)
  create(@Payload() payload: CreateRolePayload) {
    return this.rolesService.create(
      { name: payload.name, organizationId: payload.organizationId },
      payload.context.userId,
    );
  }

  @MessagePattern(ROLES_PATTERNS.UPDATE)
  update(@Payload() payload: UpdateRolePayload) {
    return this.rolesService.update(
      payload.id,
      payload.organizationId,
      { name: payload.name },
      payload.context.userId,
    );
  }

  @MessagePattern(ROLES_PATTERNS.DELETE)
  remove(@Payload() payload: DeleteRolePayload) {
    return this.rolesService.delete(payload.id, payload.organizationId);
  }
}
