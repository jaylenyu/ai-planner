import { IsIn, IsOptional, IsString } from 'class-validator';

export class SavePlanDraftDto {
  @IsString()
  draftId: string;

  @IsIn(['personal', 'shared'])
  scope: 'personal' | 'shared';

  @IsOptional()
  @IsString()
  workspaceId?: string;
}
