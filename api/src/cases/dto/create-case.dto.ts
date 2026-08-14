import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CasePriority } from '@signaldesk/shared';

export class CreateCaseDto {
  @IsString()
  @IsNotEmpty({ message: 'title is required and must not be empty' })
  @MaxLength(255, { message: 'title must not exceed 255 characters' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CasePriority, {
    message: 'priority must be one of: low, medium, high, urgent',
  })
  @IsNotEmpty({ message: 'priority is required' })
  priority: CasePriority;
}
