import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { USERS_PATTERNS } from '@app/contracts/users/users.patterns';
import type {
  FindAllUsersPayload,
  FindUserByIdPayload,
  UserProfileStatusPayload,
  CreateUserPayload,
  UpdateUserPayload,
  DeleteUserPayload,
  GetMembershipsPayload,
  RemoveFromOrgPayload,
} from '@app/contracts/users/users.payloads';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern(USERS_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: FindAllUsersPayload) {
    return this.usersService.findAll(payload.page, payload.size, {
      roleId: payload.role_id,
      search: payload.search,
    });
  }

  @MessagePattern(USERS_PATTERNS.FIND_BY_ID)
  findById(@Payload() payload: FindUserByIdPayload) {
    return this.usersService.findById(payload.id);
  }

  @MessagePattern(USERS_PATTERNS.PROFILE_STATUS)
  profileStatus(@Payload() payload: UserProfileStatusPayload) {
    return this.usersService.checkProfileStatus(payload.userId);
  }

  @MessagePattern(USERS_PATTERNS.CREATE)
  create(@Payload() payload: CreateUserPayload) {
    return this.usersService.create({
      name: payload.name,
      avatar: payload.avatar,
      roleId: payload.roleId,
      organizationId: payload.organizationId,
    });
  }

  @MessagePattern(USERS_PATTERNS.UPDATE)
  update(@Payload() payload: UpdateUserPayload) {
    return this.usersService.update(payload.id, {
      name: payload.name,
      avatar: payload.avatar,
      roleId: payload.roleId,
      organizationId: payload.organizationId,
      email: payload.email,
      msisdn: payload.msisdn,
    });
  }

  @MessagePattern(USERS_PATTERNS.DELETE)
  remove(@Payload() payload: DeleteUserPayload) {
    return this.usersService.remove(payload.id);
  }

  @MessagePattern(USERS_PATTERNS.GET_MEMBERSHIPS)
  getMemberships(@Payload() payload: GetMembershipsPayload) {
    return this.usersService.getUserMemberships(payload.userId);
  }

  @MessagePattern(USERS_PATTERNS.REMOVE_FROM_ORG)
  removeFromOrganization(@Payload() payload: RemoveFromOrgPayload) {
    return this.usersService.removeFromOrganization(
      payload.userId,
      payload.organizationId,
    );
  }
}
