import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({ description: 'Session ID', example: 'uuid' })
  id: string;

  @ApiPropertyOptional({ description: 'Browser / client user-agent', nullable: true })
  userAgent: string | null;

  @ApiPropertyOptional({ description: 'Client IP address', nullable: true })
  ipAddress: string | null;

  @ApiPropertyOptional({ description: 'Device name', nullable: true })
  deviceName: string | null;

  @ApiPropertyOptional({ description: 'Last used timestamp', nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Expiry timestamp' })
  expiresAt: Date;

  @ApiProperty({ description: 'Whether revoked' })
  isRevoked: boolean;
}
