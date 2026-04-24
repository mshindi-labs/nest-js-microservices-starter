import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchOrgDto {
  @ApiProperty({ description: 'Organization UUID to switch context to', example: 'uuid' })
  @IsUUID()
  organizationId: string;
}
