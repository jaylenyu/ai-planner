import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6, { message: '인증코드는 6자리입니다.' })
  code: string;
}
