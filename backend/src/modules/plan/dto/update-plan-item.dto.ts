import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePlanItemDto {
  @IsString()
  updatedAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  time?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  link?: string | null;

  @IsOptional()
  @IsString()
  source?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceFromPrev?: number | null;
}
