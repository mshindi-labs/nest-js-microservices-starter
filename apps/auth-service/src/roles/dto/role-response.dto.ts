import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({ description: 'Role UUID' })
  id: string;

  @ApiProperty({ description: 'Role name', example: 'admin' })
  name: string;

  @ApiPropertyOptional({
    description: 'Organization UUID; null for system roles',
  })
  organizationId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
