import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GenerationJob } from '../../entities/generation-job.js';
import { Repository } from 'typeorm';
import { AiService } from '@nestjs/ai';
import { z } from 'zod';
import { createGeneratedTestSchema } from '../types/schemas.js';
import { DocumentContents } from '../../entities/document-contents.js';
import { QuestionType } from '../../types/temporary.js';
import { generatePrompt } from './generate-prompt.js';
import { DocumentNotReadyError } from '../document-not-ready.error.js';
import { GENERATION_CONFIG as config } from './generation-utils/config.js';
import {
  splitContent,
  normalizeText,
  dominantScript,
  hasWrongScript,
  selectChunkIndex,
} from './generation-utils/content.js';

export type GeneratedQuestion = {
  text: string;
  type: QuestionType;
  explanation: string;
  options: Array<{ text: string; isCorrect: boolean }>;
};

interface GenerateProps {
  jobId: string;
  questionCount: number;
  questionType: QuestionType;
}

@Injectable()
export class TestsGeneratorWorkerService {
  private readonly logger = new Logger(this.constructor.name);
  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobRepo: Repository<GenerationJob>,
    private readonly ai: AiService,
  ) {}

  async generate(
    { jobId, questionCount, questionType }: GenerateProps,
    checkpoint: {
      questions: GeneratedQuestion[];
      attempts: number;
      emptyBatches: number;
    },
    saveProgress: (checkpoint: {
      questions: GeneratedQuestion[];
      attempts: number;
      emptyBatches: number;
    }) => Promise<void>,
  ): Promise<GeneratedQuestion[]> {
    try {
      const content = await this.getDocumentContent(jobId);

      if (!content.length) {
        throw new Error(`No document content for generation job ${jobId}`);
      }
      this.logger.debug(`Sending prompt for generation job ${jobId}`);

      const questions = await this.sendGenerateReq(
        content,
        questionCount,
        questionType,
        checkpoint,
        saveProgress,
      );
      this.logger.debug(`Ollama response received for job ${jobId}`);
      return questions;
    } catch (e) {
      if (!(e instanceof DocumentNotReadyError)) {
        this.logger.error(`AI generation failed for job ${jobId}`, e);
      }
      throw e;
    }
  }

  private async sendGenerateReq(
    content: string,
    questionCount: number,
    questionType: QuestionType,
    checkpoint: {
      questions: GeneratedQuestion[];
      attempts: number;
      emptyBatches: number;
    },
    saveProgress: (checkpoint: {
      questions: GeneratedQuestion[];
      attempts: number;
      emptyBatches: number;
    }) => Promise<void>,
  ) {
    const chunks = splitContent(content);
    if (!chunks.length) throw new Error('Document content is empty');
    let batchIndex = checkpoint.attempts;
    const questions = [...checkpoint.questions];
    const seenQuestions = new Set(
      questions.map((question) => normalizeText(question.text)),
    );
    const seenOptionSets = new Set(
      questions
        .filter((question) => question.options.length)
        .map((question) =>
          JSON.stringify(
            question.options.map((option) => normalizeText(option.text)).sort(),
          ),
        ),
    );
    const script = dominantScript(content);
    let duplicateOnlyBatches = checkpoint.emptyBatches;
    const plannedBatches = Math.ceil(questionCount / config.batchSize);
    const maxAttempts =
      plannedBatches +
      Math.min(
        config.maxExtraAttempts,
        Math.max(config.minExtraAttempts, chunks.length),
      );

    while (questions.length < questionCount && batchIndex < maxAttempts) {
      if (duplicateOnlyBatches >= config.maxEmptyBatches) {
        this.logger.warn(
          `Stopping after ${duplicateOnlyBatches} attempts without progress: generated ${questions.length}/${questionCount} questions`,
        );
        break;
      }
      const count = Math.min(
        config.batchSize,
        questionCount - questions.length,
      );
      const attempt = batchIndex++;
      const chunkIndex = selectChunkIndex(
        attempt,
        chunks.length,
        plannedBatches,
      );
      const prompt = generatePrompt(
        questionType,
        count,
        chunks[chunkIndex],
        questions
          .slice(-config.recentQuestions)
          .map((question) =>
            question.text.slice(0, config.recentQuestionLength),
          ),
      );
      this.logger.debug(
        `Requesting question ${questions.length + 1}/${questionCount} from excerpt ${chunkIndex + 1}/${chunks.length} (attempt ${attempt + 1})`,
      );
      let result;
      try {
        result = await this.ai.generateObject({
          model: config.model,
          label: config.label,
          schema: createGeneratedTestSchema(questionType, count),
          maxOutputTokens:
            count *
            (questionType === QuestionType.MultipleChoice
              ? config.multipleChoiceTokens
              : config.openEndedTokens),
          temperature: config.temperature,
          ...prompt,
        });
      } catch (error) {
        if (!questions.length) throw error;
        this.logger.warn(
          `Generation failed after ${questions.length} questions; returning partial result`,
          error,
        );
        break;
      }
      const { object, usage } = result;

      const previousCount = questions.length;
      this.collectQuestions(
        object.questions,
        questions,
        seenQuestions,
        seenOptionSets,
        script,
      );

      duplicateOnlyBatches =
        questions.length === previousCount ? duplicateOnlyBatches + 1 : 0;

      await saveProgress({
        questions,
        attempts: batchIndex,
        emptyBatches: duplicateOnlyBatches,
      });

      this.logger.debug(
        `Generated ${questions.length}/${questionCount} questions from excerpt ${chunkIndex + 1}/${chunks.length} (output tokens: ${usage?.outputTokens ?? 'unknown'})`,
      );
    }

    if (questions.length < questionCount) {
      this.logger.warn(
        `Generated ${questions.length}/${questionCount} questions after ${batchIndex} attempts`,
      );
    }
    return questions;
  }

  private collectQuestions(
    batch: z.infer<ReturnType<typeof createGeneratedTestSchema>>['questions'],
    questions: GeneratedQuestion[],
    seenQuestions: Set<string>,
    seenOptionSets: Set<string>,
    script: ReturnType<typeof dominantScript>,
  ): void {
    for (const question of batch) {
      const texts = [question.text, question.explanation, ...question.options];
      const exceedsLimit =
        question.text.trim().length > config.questionLength ||
        question.explanation.trim().length > config.explanationLength ||
        question.options.some(
          (option) => option.trim().length > config.optionLength,
        );
      const wrongScript = texts.some((text) => hasWrongScript(text, script));
      if (exceedsLimit || wrongScript) {
        this.logger.warn(
          `Skipping question: ${exceedsLimit ? 'length limit exceeded' : 'language script differs from document'}`,
        );
        continue;
      }
      const normalizedText = normalizeText(question.text);
      if (seenQuestions.has(normalizedText)) {
        this.logger.warn(
          `Skipping duplicate generated question: ${question.text}`,
        );
        continue;
      }
      if (question.type === QuestionType.MultipleChoice) {
        const { correctOptionIndex, options, ...data } = question;
        const normalizedOptions = options.map(normalizeText);
        const optionSet = JSON.stringify([...normalizedOptions].sort());
        if (
          normalizedOptions.some((option) => !option) ||
          new Set(normalizedOptions).size !== options.length ||
          seenOptionSets.has(optionSet)
        ) {
          this.logger.warn(
            `Skipping question with repeated answer options: ${question.text}`,
          );
          continue;
        }
        seenOptionSets.add(optionSet);
        seenQuestions.add(normalizedText);
        const shuffledOptions = options.map((text, index) => ({
          text,
          isCorrect: index === correctOptionIndex,
        }));
        for (let index = shuffledOptions.length - 1; index > 0; index--) {
          const swapIndex = Math.floor(Math.random() * (index + 1));
          [shuffledOptions[index], shuffledOptions[swapIndex]] = [
            shuffledOptions[swapIndex],
            shuffledOptions[index],
          ];
        }
        questions.push({ ...data, options: shuffledOptions });
      } else {
        seenQuestions.add(normalizedText);
        questions.push({ ...question, options: [] });
      }
    }
  }

  private async getDocumentContent(jobId: string) {
    this.logger.debug(`Loading document content for job ${jobId}`);
    const rows = await this.generationJobRepo
      .createQueryBuilder('job')
      .innerJoin('job.documents', 'document')
      .leftJoin(DocumentContents, 'content', 'content.id = document.id')
      .select('content.markdown', 'markdown')
      .where('job.id = :jobId', { jobId })
      .orderBy('document.createdAt', 'ASC')
      .getRawMany<{ markdown: string | null }>();

    if (!rows.length)
      throw new Error(`No documents found for generation job ${jobId}`);
    if (rows.some((row) => row.markdown === null))
      throw new DocumentNotReadyError(jobId);
    return rows.map((row) => row.markdown).join('\n\n');
  }
}
