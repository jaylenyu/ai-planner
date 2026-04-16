import { IsString } from 'class-validator';

export class DeletePlanItemDto {
  @IsString()
  updatedAt: string;
}
