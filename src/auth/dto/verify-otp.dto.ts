import { IsString, IsEmail, IsNumberString } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsNumberString()
  otpCode: string;
}
