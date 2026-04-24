import { IsNumber, IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export interface PaginationResponse<T> {
  records: T[];
  page: number;
  size: number;
  count: number;
  pages?: number;
}

export class BasePaginationResponseDto<T> {
  @ApiProperty({ example: 1 })
  @IsNumber()
  page: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  size: number;

  @ApiProperty({ example: 100 })
  count: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @IsOptional()
  pages?: number;

  @ApiProperty({ type: Array })
  records: T[];
}
