import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'The name of the user', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'The avatar of the user',
    example: 'https://example.com/avatar.jpg',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  avatar?: string;

  @ApiPropertyOptional({ description: 'The role ID of the user', example: 1 })
  @IsNumber()
  @IsOptional()
  roleId?: number;

  @ApiPropertyOptional({
    description: 'The organization ID of the user',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  organizationId?: number;
}
