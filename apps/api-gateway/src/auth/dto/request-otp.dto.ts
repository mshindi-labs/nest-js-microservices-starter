import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from 'generated/prisma/client';

export class RequestOtpDto {
  @ApiProperty({
    description: 'User identifier (email or phone number)',
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    description: 'Account type',
    enum: AccountType,
    example: AccountType.EMAIL,
  })
  @IsEnum(AccountType)
  @IsNotEmpty()
  accountType: AccountType;
}
