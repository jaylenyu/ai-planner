import { IsString, MaxLength, MinLength } from 'class-validator';

export class CompleteOAuthSignupDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  nickname: string;
}
