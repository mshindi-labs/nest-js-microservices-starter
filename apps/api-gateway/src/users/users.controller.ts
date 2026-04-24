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
  ParseIntPipe,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ApiBearerAuth } from '@nestjs/swagger';
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
    @Param('user_id', ParseIntPipe) userId: number,
  ): Promise<unknown> {
    return firstValueFrom(
      this.authClient.send(USERS_PATTERNS.PROFILE_STATUS, { userId }),
    );
  }

  @Get('user/:user_id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('user_id', ParseIntPipe) userId: number): Promise<unknown> {
    return firstValueFrom(
      this.authClient.send(USERS_PATTERNS.FIND_BY_ID, { id: userId }),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  create(@Body() dto: CreateUserDto): Promise<unknown> {
    return firstValueFrom(this.authClient.send(USERS_PATTERNS.CREATE, dto));
  }

  @Patch('user/:user_id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('user_id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserDto,
  ): Promise<unknown> {
    return firstValueFrom(
      this.authClient.send(USERS_PATTERNS.UPDATE, { id: userId, ...dto }),
    );
  }

  @Delete('user/:user_id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('user_id', ParseIntPipe) userId: number): Promise<void> {
    return firstValueFrom(
      this.authClient.send(USERS_PATTERNS.DELETE, { id: userId }),
    );
  }
}
