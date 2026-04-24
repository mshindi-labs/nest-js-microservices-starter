import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
    maximum: 1000,
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }: { value: unknown }): number =>
    value !== undefined && value !== null && value !== '' ? Number(value) : 1,
  )
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @Max(1000, { message: 'Page cannot exceed 1000' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }: { value: unknown }): number =>
    value !== undefined && value !== null && value !== '' ? Number(value) : 20,
  )
  @IsInt({ message: 'Size must be an integer' })
  @Min(1, { message: 'Size must be at least 1' })
  @Max(100, { message: 'Size cannot exceed 100' })
  size?: number;
}
