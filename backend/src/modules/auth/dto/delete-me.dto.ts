import { IsOptional, IsString } from 'class-validator';

export class DeleteMeDto {
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  verifyToken?: string;
}
