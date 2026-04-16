import { IsEmail, IsString, IsOptional } from 'class-validator';

export class RequestEmailCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  captchaToken?: string;
}
