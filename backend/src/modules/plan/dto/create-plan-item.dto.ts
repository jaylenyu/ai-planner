import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlanItemDto {
  @IsString()
  updatedAt: string;

  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(40)
  type: string;

  @IsString()
  @MaxLength(60)
  time: string;

  @IsString()
  @MaxLength(240)
  address: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceFromPrev?: number;
}
