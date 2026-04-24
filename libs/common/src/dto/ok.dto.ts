import { IsNotEmpty, IsString } from 'class-validator';

export class OkResponseDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
