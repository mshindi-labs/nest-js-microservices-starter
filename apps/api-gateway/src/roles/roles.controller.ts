import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { User } from '@app/common/decorators/user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import type { AuthorizedUser } from '@app/common/types/authenticated-request';
import type { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';
import { AUTH_SERVICE, ROLES_PATTERNS } from '@app/contracts';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('Roles')
@ApiBearerAuth('access-token')
@Controller('organizations/:orgId/roles')
export class RolesController {
  constructor(@Inject(AUTH_SERVICE) private readonly authClient: ClientProxy) {}

  @Get()
  @Roles('owner', 'admin', 'member')
  @ApiOperation({ summary: 'List roles for an organization' })
  @ApiResponse({ status: 200, description: 'Paginated list of roles' })
  findAll(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: PaginationQueryDto,
    @User() user: AuthorizedUser,
  ): Promise<unknown> {
    return firstValueFrom(
      this.authClient.send(ROLES_PATTERNS.FIND_ALL, {
        organizationId: orgId,
        page: query.page,
        size: query.size,
        context: user,
      }),
    );
  }

  @Get(':id')
  @Roles('owner', 'admin', 'member')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findById(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: AuthorizedUser,
  ): Promise<unknown> {
    return firstValueFrom(
      this.authClient.send(ROLES_PATTERNS.FIND_BY_ID, {
        id,
        organizationId: orgId,
        context: user,
      }),
    );
  }

  @Post()
  @Roles('owner', 'admin')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a role for an organization' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({
    status: 409,
    description: 'Role name already exists in this organization',
  })
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateRoleDto,
    @User() user: AuthorizedUser,
  ): Promise<unknown> {
    return firstValueFrom(
      this.authClient.send(ROLES_PATTERNS.CREATE, {
        name: dto.name,
        organizationId: orgId,
        context: user,
      }),
    );
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @User() user: AuthorizedUser,
  ): Promise<unknown> {
    return firstValueFrom(
      this.authClient.send(ROLES_PATTERNS.UPDATE, {
        id,
        organizationId: orgId,
        name: dto.name,
        context: user,
      }),
    );
  }

  @Delete(':id')
  @Roles('owner')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({
    status: 409,
    description: 'Role has active members or pending invitations',
  })
  remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: AuthorizedUser,
  ): Promise<void> {
    return firstValueFrom(
      this.authClient.send(ROLES_PATTERNS.DELETE, {
        id,
        organizationId: orgId,
        context: user,
      }),
    );
  }
}
