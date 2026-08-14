import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CasePriority, CaseStatus } from '@signaldesk/shared';

export class ListCasesQueryDto {
  @IsOptional()
  @IsEnum(CaseStatus, {
    message: 'status must be one of: open, assigned, resolved',
  })
  status?: CaseStatus;

  @IsOptional()
  @IsEnum(CasePriority, {
    message: 'priority must be one of: low, medium, high, urgent',
  })
  priority?: CasePriority;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  @IsBoolean()
  mine?: boolean;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
