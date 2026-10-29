import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { QuestionType } from '../../types/temporary.js';
import { PartialType } from '@nestjs/mapped-types';

export class CreateTestDto {
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @IsNumber()
  @Min(1)
  @Max(30)
  questionCount: number;

  @IsEnum(QuestionType)
  questionType: QuestionType;

  @ArrayNotEmpty()
  @ArrayMaxSize(5)
  @IsUUID(4, { each: true })
  files: string[];
}

export class UpdateTestDto extends PartialType(CreateTestDto) {}
