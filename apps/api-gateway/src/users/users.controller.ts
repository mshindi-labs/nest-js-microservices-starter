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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { User } from '@app/common/decorators/user.decorator';
import type { AuthorizedUser } from '@app/common/types/authenticated-request';
import { UsersQueryDto } from './dto/users-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AUTH_SERVICE, USERS_PATTERNS } from '@app/contracts';
import type { PaginationResponse } from '@app/common/dto/paginated-response.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(@Inject(AUTH_SERVICE) private readonly authClient: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  findAll(@Query() query: UsersQueryDto): Promise<PaginationResponse<unknown>> {
    return firstValueFrom(
      this.authClient.send(USERS_PATTERNS.FIND_ALL, {
        page: query.page,
        size: query.size,
        role_id: query.role_id,
        search: query.search,
      }),
    );
  }

  @Get('user/:user_id/profile-status')
  @ApiOperation({ summary: 'Check profile completion status' })
  @ApiResponse({ status: 200, description: 'Profile status retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getProfileStatus(
    @Param('user_id', ParseUUIDPipe) userId: string,
  ): Promise<unknown> {
    return firstValueFrom(
      this.authClient.send(USERS_PATTERNS.PROFILE_STATUS, { userId }),
    );
  }

  @Get('user/:user_id/memberships')
  @ApiOperation({ summary: 'Get all organization memberships for a user' })
  @ApiResponse({ status: 200, description: 'Memberships retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getMemberships(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @User() user: AuthorizedUser,
  ): Promise<unknown> {
    return firstValueFrom(
      this.authClient.send(USERS_PATTERNS.GET_MEMBERSHIPS, {
        userId,
        context: user,
      }),
    );
  }

  @Get('user/:user_id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('user_id', ParseUUIDPipe) userId: string): Promise<unknown> {
    return firstValueFrom(
      this.authClient.send(USERS_PATTERNS.FIND_BY_ID, { id: userId }),
    );
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  create(
    @Body() dto: CreateUserDto,
    @User() user: AuthorizedUser,
  ): Promise<unknown> {
    return firstValueFrom(
      this.authClient.send(USERS_PATTERNS.CREATE, { ...dto, context: user }),
    );
  }

  @Patch('user/:user_id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserDto,
    @User() user: AuthorizedUser,
  ): Promise<unknown> {
    return firstValueFrom(
      this.authClient.send(USERS_PATTERNS.UPDATE, {
        id: userId,
        ...dto,
        context: user,
      }),
    );
  }

  @Delete('user/:user_id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @User() user: AuthorizedUser,
  ): Promise<void> {
    return firstValueFrom(
      this.authClient.send(USERS_PATTERNS.DELETE, {
        id: userId,
        context: user,
      }),
    );
  }

  @Delete('user/:user_id/memberships/:org_id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove user from an organization' })
  @ApiResponse({ status: 204, description: 'Membership removed' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  removeFromOrganization(
    @Param('user_id', ParseUUIDPipe) userId: string,
    @Param('org_id', ParseUUIDPipe) organizationId: string,
    @User() user: AuthorizedUser,
  ): Promise<void> {
    return firstValueFrom(
      this.authClient.send(USERS_PATTERNS.REMOVE_FROM_ORG, {
        userId,
        organizationId,
        context: user,
      }),
    );
  }
}
