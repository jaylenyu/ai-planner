import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Equals,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  password: string;

  @Equals(true, { message: '이용약관에 동의해주세요.' })
  agreedTerms: boolean;

  @Equals(true, { message: '개인정보 처리방침에 동의해주세요.' })
  agreedPrivacy: boolean;
}
