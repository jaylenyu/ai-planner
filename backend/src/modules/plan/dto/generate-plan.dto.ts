import {
  IsString,
  IsIn,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class GeneratePlanDto {
  @IsString()
  @MinLength(5, { message: '입력이 너무 짧습니다. 좀 더 자세히 알려주세요.' })
  @MaxLength(500, { message: '입력이 너무 깁니다. 500자 이내로 작성해주세요.' })
  rawInput: string;

  @IsIn(['date', 'trip'])
  mode: 'date' | 'trip';

  @IsOptional()
  @IsString()
  workspaceId?: string;
}
