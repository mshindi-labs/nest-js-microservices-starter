import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class UsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter users by role ID',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? Number(value)
      : undefined,
  )
  @IsInt({ message: 'role_id must be an integer' })
  @Min(1, { message: 'role_id must be at least 1' })
  role_id?: number;

  @ApiPropertyOptional({
    description: 'Search by name, email, or phone number',
    example: 'john',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  search?: string;
}
