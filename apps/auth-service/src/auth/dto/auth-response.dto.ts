import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from 'generated/prisma/client';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
}

export class CurrentUserResponseDto {
  @ApiProperty({ description: 'Account ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'User ID', example: 'uuid' })
  userId: string;

  @ApiPropertyOptional({ description: 'Email address', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ description: 'Phone number (MSISDN)', nullable: true })
  msisdn: string | null;

  @ApiProperty({ description: 'Account type', enum: AccountType })
  accountType: AccountType;

  @ApiProperty({ description: 'Whether email is verified' })
  isEmailVerified: boolean;

  @ApiProperty({ description: 'Whether phone number is verified' })
  isMsisdnVerified: boolean;

  @ApiProperty({ description: 'Whether account is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last login timestamp', nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty({ description: 'Account creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Account last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'User details', type: UserResponseDto })
  user: UserResponseDto;

  @ApiPropertyOptional({ description: 'Active role (convenience)', type: Object })
  role?: { id: string; name: string; createdAt: Date; updatedAt: Date };
}

export type { JwtPayload } from '@app/contracts';
