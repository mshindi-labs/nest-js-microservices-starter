import { IsEmail, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: 'The email of the user (updates the related account)',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description:
      'The phone number (MSISDN) in E.164 format (updates the related account)',
    example: '+255612345678',
  })
  @IsOptional()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message:
      'msisdn must be a valid phone number (10-15 digits, optionally prefixed with +)',
  })
  @MaxLength(20)
  msisdn?: string;
}
