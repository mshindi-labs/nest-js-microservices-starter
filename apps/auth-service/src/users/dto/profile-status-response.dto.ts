import { ApiProperty } from '@nestjs/swagger';

export class ProfileStatusResponseDto {
  @ApiProperty({
    description:
      'True when the user has set a real name and a non-default role',
    example: false,
  })
  isProfileComplete: boolean;

  @ApiProperty({
    description:
      'True when the user name still matches their phone number (OTP default)',
    example: true,
  })
  hasDefaultName: boolean;

  @ApiProperty({
    description: 'True when the user role is still the default "other"',
    example: true,
  })
  hasDefaultRole: boolean;
}
