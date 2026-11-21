import { z } from 'zod';
import { QuestionType } from '../../types/temporary.js';

export function createGeneratedTestSchema(
  questionType: QuestionType,
  questionCount: number,
) {
  const questionBase = z.object({
    text: z.string().min(1),
    explanation: z.string().min(1),
  });

  const questionSchema =
    questionType === QuestionType.MultipleChoice
      ? questionBase.extend({
          type: z.literal(QuestionType.MultipleChoice),
          options: z.array(z.string().min(1)).length(4),
          correctOptionIndex: z.number().int().min(0).max(3),
        })
      : questionBase.extend({
          type: z.literal(QuestionType.OpenEnded),
          options: z.array(z.string().min(1)).max(0),
        });

  return z.object({
    questions: z.array(questionSchema).max(questionCount),
  });
}
