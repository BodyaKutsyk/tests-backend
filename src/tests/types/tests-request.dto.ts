import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsEnum,
  IsNumber,
  IsUUID,
  ValidateBy,
} from 'class-validator';
import { QuestionType } from '../../types/temporary.js';
import { PartialType } from '@nestjs/mapped-types';
import {
  BRAKE_OUTBOX_RELAY_NUM,
  BRAKE_TRANSACTION_NUM,
} from '../../utils/demos.js';

export class CreateTestDto {
  userId?: string;

  @IsNumber()
  @ValidateBy({
    name: 'allowedQuestionCount',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'number' &&
        ((value >= 1 && value <= 30) ||
          value === BRAKE_TRANSACTION_NUM ||
          value === BRAKE_OUTBOX_RELAY_NUM),
      defaultMessage: () =>
        'questionCount must be between 1 and 30 or a demo trigger value',
    },
  })
  questionCount: number;

  @IsEnum(QuestionType)
  questionType: QuestionType;

  @ArrayNotEmpty()
  @ArrayMaxSize(5)
  @IsUUID(4, { each: true })
  files: string[];
}

export class UpdateTestDto extends PartialType(CreateTestDto) {}
