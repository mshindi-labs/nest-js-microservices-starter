import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

class RoleDto {
  @ApiProperty({ description: 'The ID of the role', example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ description: 'The name of the role', example: 'Admin' })
  @Expose()
  name: string;
}

class OrganizationDto {
  @ApiProperty({ description: 'The ID of the organization', example: 1 })
  @Expose()
  id: number;

  @ApiProperty({
    description: 'The name of the organization',
    example: 'Organization 1',
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: 'The description of the organization',
    example: 'This is the first organization',
    nullable: true,
  })
  @Expose()
  description: string | null;
}

export class UserResponseDto {
  @ApiProperty({ description: 'The ID of the user', example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ description: 'The name of the user', example: 'John Doe' })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: 'The avatar of the user',
    example: 'https://example.com/avatar.jpg',
  })
  @Expose()
  avatar: string | null;

  @ApiProperty({ description: 'The ID of the role', example: 1 })
  @Expose()
  roleId: number;

  @ApiPropertyOptional({
    description: 'The ID of the organization',
    example: 1,
  })
  @Expose()
  organizationId: number | null;

  @ApiPropertyOptional({ description: 'The role of the user', type: RoleDto })
  @Expose()
  @Type(() => RoleDto)
  role?: RoleDto;

  @ApiPropertyOptional({
    description: 'The organization of the user',
    type: OrganizationDto,
  })
  @Expose()
  @Type(() => OrganizationDto)
  organization?: OrganizationDto | null;

  @ApiProperty({
    description: 'The timestamp when the user was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'The timestamp when the user was updated',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  @Exclude()
  accounts?: unknown;
}
