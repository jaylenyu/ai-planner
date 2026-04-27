import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  newPassword: string;

  @IsOptional()
  @IsString()
  verifyToken?: string;
}
