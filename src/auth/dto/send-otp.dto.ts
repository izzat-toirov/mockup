import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  email: string;
}
