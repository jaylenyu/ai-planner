import { IsString, Length } from 'class-validator';

export class VerifyPasswordSetupDto {
  @IsString()
  @Length(6, 6, { message: '6자리 인증코드를 입력해주세요.' })
  code: string;
}
