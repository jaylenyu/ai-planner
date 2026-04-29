import { IsString } from 'class-validator';

export class SharePlanDto {
  @IsString()
  updatedAt: string;
}
