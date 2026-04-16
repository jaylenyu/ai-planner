import { IsOptional, IsString } from 'class-validator';

export class UpdatePlanDto {
  @IsString()
  updatedAt: string;

  @IsOptional()
  @IsString()
  summary?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;
}
