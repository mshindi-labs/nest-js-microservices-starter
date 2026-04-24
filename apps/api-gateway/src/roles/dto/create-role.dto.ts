import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name', example: 'manager' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
