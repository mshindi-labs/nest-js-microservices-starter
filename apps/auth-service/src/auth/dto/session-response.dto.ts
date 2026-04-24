import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({ description: 'Session (RefreshToken) ID', example: 'uuid' })
  id: string;

  @ApiPropertyOptional({ description: 'Browser / client user-agent', nullable: true })
  userAgent: string | null;

  @ApiPropertyOptional({ description: 'Client IP address', nullable: true })
  ipAddress: string | null;

  @ApiPropertyOptional({ description: 'Device name (if provided by client)', nullable: true })
  deviceName: string | null;

  @ApiPropertyOptional({ description: 'When this session token was last used', nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty({ description: 'When this session was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When this session expires' })
  expiresAt: Date;

  @ApiProperty({ description: 'Whether this session has been revoked' })
  isRevoked: boolean;
}
