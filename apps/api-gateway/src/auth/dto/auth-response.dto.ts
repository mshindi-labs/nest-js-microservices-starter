import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'User details', type: Object })
  user: Record<string, unknown>;
}

export class CurrentUserResponseDto {
  @ApiProperty({ description: 'Account ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'User ID', example: 1 })
  userId: number;

  @ApiPropertyOptional({ description: 'Email address', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ description: 'Phone number (MSISDN)', nullable: true })
  msisdn: string | null;

  @ApiProperty({
    description: 'Account type (EMAIL, MSISDN, GOOGLE)',
    example: 'EMAIL',
  })
  accountType: string;

  @ApiProperty({ description: 'Whether email is verified' })
  isEmailVerified: boolean;

  @ApiProperty({ description: 'Whether phone number is verified' })
  isMsisdnVerified: boolean;

  @ApiProperty({ description: 'Whether account is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Account creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Account last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'User details', type: Object })
  user: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'User role (convenience)', type: Object })
  role?: { id: number; name: string; createdAt: Date; updatedAt: Date };
}
