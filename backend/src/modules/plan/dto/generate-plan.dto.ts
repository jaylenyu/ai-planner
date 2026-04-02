import { IsString, IsIn, MinLength } from 'class-validator';

export class GeneratePlanDto {
  @IsString()
  @MinLength(5, { message: '입력이 너무 짧습니다. 좀 더 자세히 알려주세요.' })
  rawInput: string;

  @IsIn(['date', 'trip'])
  mode: 'date' | 'trip';
}
