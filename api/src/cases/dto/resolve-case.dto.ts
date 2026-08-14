import 'reflect-metadata';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResolveCaseDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'resolutionNote is required and must not be empty' })
  @MaxLength(2000, { message: 'resolutionNote must not exceed 2000 characters' })
  resolutionNote: string;
}
