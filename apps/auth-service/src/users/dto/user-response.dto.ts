import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

class RoleDto {
  @ApiProperty({ description: 'Role ID', example: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Role name', example: 'Admin' })
  @Expose()
  name: string;
}

class OrganizationDto {
  @ApiProperty({ description: 'Organization ID', example: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Organization name', example: 'Acme Corp' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Organization description', nullable: true })
  @Expose()
  description: string | null;
}

class MembershipDto {
  @ApiProperty({ description: 'Membership ID', example: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Organization ID', example: 'uuid' })
  @Expose()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Organization details', type: OrganizationDto })
  @Expose()
  @Type(() => OrganizationDto)
  organization?: OrganizationDto;

  @ApiProperty({ description: 'Role ID', example: 'uuid' })
  @Expose()
  roleId: string;

  @ApiPropertyOptional({ description: 'Role details', type: RoleDto })
  @Expose()
  @Type(() => RoleDto)
  role?: RoleDto;

  @ApiProperty({ description: 'Whether membership is active' })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'When the user joined the organization' })
  @Expose()
  joinedAt: Date;
}

export class UserResponseDto {
  @ApiProperty({ description: 'User ID', example: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'User name', example: 'John Doe' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Avatar URL', nullable: true })
  @Expose()
  avatar: string | null;

  @ApiPropertyOptional({ description: 'Organization memberships', type: [MembershipDto] })
  @Expose()
  @Type(() => MembershipDto)
  memberships?: MembershipDto[];

  @ApiProperty({ description: 'Created at' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  @Expose()
  updatedAt: Date;

  @Exclude()
  accounts?: unknown;
}
