import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsEnum,
  IsOptional,
  MaxLength,
  IsNumber,
  IsInt,
} from 'class-validator';
import { AccountType } from 'generated/prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ description: 'The name of the user', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'The identifier of the user (email or msisdn)',
    example: 'john.doe@example.com or +255612345678',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    description: 'The phone number (MSISDN) in E.164 format',
    example: '+255612345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message:
      'msisdn must be a valid phone number (10-15 digits, optionally prefixed with +)',
  })
  msisdn: string;

  @ApiProperty({ description: 'The role ID of the user', example: 1 })
  @IsNumber()
  @IsInt()
  @IsNotEmpty()
  roleId: number;

  @ApiProperty({
    description: 'The password of the user',
    example: 'Password123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, {
    message: 'Password must contain at least one letter and one number',
  })
  password: string;

  @ApiProperty({ description: 'The type of the account', example: 'EMAIL' })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiPropertyOptional({
    description: 'The organization ID of the user',
    example: 101,
  })
  @IsNumber()
  @IsOptional()
  organizationId?: number;

  @ApiPropertyOptional({
    description: 'The avatar of the user',
    example: 'https://example.com/avatar.jpg',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  avatar?: string;
}
