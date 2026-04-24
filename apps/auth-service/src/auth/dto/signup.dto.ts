import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsEnum,
  IsOptional,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { AccountType } from 'generated/prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ description: 'User name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Identifier (email or msisdn)',
    example: 'john.doe@example.com or +255612345678',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ description: 'Phone number (E.164)', example: '+255612345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'msisdn must be a valid phone number (10-15 digits, optionally prefixed with +)',
  })
  msisdn: string;

  @ApiPropertyOptional({ description: 'Role UUID', example: 'uuid' })
  @IsUUID()
  @IsOptional()
  roleId?: string;

  @ApiProperty({ description: 'Password', example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, {
    message: 'Password must contain at least one letter and one number',
  })
  password: string;

  @ApiProperty({ description: 'Account type', example: 'EMAIL' })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiPropertyOptional({ description: 'Organization UUID', example: 'uuid' })
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Avatar URL', example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  avatar?: string;
}
