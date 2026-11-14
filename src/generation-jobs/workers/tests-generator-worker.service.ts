import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GenerationJob } from '../../entities/generation-job.js';
import { Repository } from 'typeorm';
import { AiService } from '@nestjs/ai';
import { createGeneratedTestSchema } from '../types/schemas.js';
import { DocumentContents } from '../../entities/document-contents.js';
import { QuestionType } from '../../types/temporary.js';
import { generatePrompt } from './generate-prompt.js';
import {
  BadRequestProblem,
  NotFoundProblem,
} from '../../exceptions/problem-errors.js';

export type GeneratedQuestion = {
  text: string;
  type: QuestionType;
  explanation: string;
  options: Array<{ text: string; isCorrect: boolean }>;
};

@Injectable()
export class TestsGeneratorWorkerService {
  private readonly logger = new Logger(this.constructor.name);
  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobRepo: Repository<GenerationJob>,
    private readonly ai: AiService,
  ) {}

  async generate(
    jobId: string,
    questionCount: number,
    questionType: QuestionType,
  ): Promise<GeneratedQuestion[]> {
    try {
      const content = await this.getDocumentContent(jobId);

      if (!content.length) {
        throw new BadRequestProblem();
      }
      this.logger.debug(`Sending prompt for generation job ${jobId}`);

      const questions = await this.sendGenerateReq(content, questionCount, questionType);
      this.logger.debug(`Ollama response received for job ${jobId}`);
      return questions;
    } catch (e) {
      this.logger.error(`AI generation failed for job ${jobId}`, e);
      throw e;
    }
  }

  private async sendGenerateReq(
    content: string,
    questionCount: number,
    questionType: QuestionType,
  ) {
    // Small batches amortize inference overhead without demanding too much output.
    const batchSize = 3;
    // Keep input small enough for the model's 4096-token context, including output.
    const chunks: string[] = [];
    let chunk = '';
    for (const part of content.split(/(?<=\n)|(?<=[.!?])\s+/u)) {
      if (chunk && chunk.length + part.length > 2400) {
        chunks.push(chunk.trim());
        chunk = '';
      }
      if (part.length > 2400) {
        chunks.push(...(part.match(/[\s\S]{1,2400}/gu) ?? []));
      } else {
        chunk += part;
      }
    }
    if (chunk.trim()) chunks.push(chunk.trim());
    if (!chunks.length) throw new BadRequestProblem();
    let batchIndex = 0;
    const questions: GeneratedQuestion[] = [];
    const seenQuestions = new Set<string>();
    const seenOptionSets = new Set<string>();
    const normalize = (text: string) =>
      text.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const scriptCounts = (text: string) => ({
      cyrillic: (text.match(/\p{Script=Cyrillic}/gu) ?? []).length,
      latin: (text.match(/\p{Script=Latin}/gu) ?? []).length,
    });
    const documentScripts = scriptCounts(content);
    const dominantScript = documentScripts.cyrillic > documentScripts.latin * 2
      ? 'cyrillic'
      : documentScripts.latin > documentScripts.cyrillic * 2 ? 'latin' : null;
    let duplicateOnlyBatches = 0;
    const plannedBatches = Math.ceil(questionCount / batchSize);
    const maxAttempts = plannedBatches + Math.min(5, Math.max(2, chunks.length));

    while (questions.length < questionCount && batchIndex < maxAttempts) {
      if (duplicateOnlyBatches >= 3) {
        this.logger.warn(
          `Stopping after ${duplicateOnlyBatches} attempts without progress: generated ${questions.length}/${questionCount} questions`,
        );
        break;
      }
      const count = Math.min(batchSize, questionCount - questions.length);
      const attempt = batchIndex++;
      // Spread the first pass across the entire document, then visit other excerpts.
      const chunkIndex = chunks.length >= plannedBatches
        ? (Math.floor((attempt % plannedBatches) * chunks.length / plannedBatches) + Math.floor(attempt / plannedBatches)) % chunks.length
        : attempt % chunks.length;
      const prompt = generatePrompt(
        questionType,
        count,
        chunks[chunkIndex],
        questions.slice(-12).map((question) => question.text.slice(0, 160)),
      );
      this.logger.debug(`Requesting question ${questions.length + 1}/${questionCount} from excerpt ${chunkIndex + 1}/${chunks.length} (attempt ${attempt + 1})`);
      let result;
      try {
        result = await this.ai.generateObject({
          model: 'default',
          label: 'test-generation',
          schema: createGeneratedTestSchema(questionType, count),
          maxOutputTokens: count * (questionType === QuestionType.MultipleChoice ? 600 : 350),
          temperature: 0.6,
          ...prompt,
        });
      } catch (error) {
        if (!questions.length) throw error;
        this.logger.warn(`Generation failed after ${questions.length} questions; returning partial result`, error);
        break;
      }
      const { object, usage } = result;

      const previousCount = questions.length;
      for (const question of object.questions) {
        const texts = [question.text, question.explanation, ...question.options];
        const exceedsLimit = question.text.trim().length > 200 ||
          question.explanation.trim().length > 300 ||
          question.options.some((option) => option.trim().length > 120);
        const wrongScript = dominantScript && texts.some((text) => {
          const counts = scriptCounts(text);
          const other = dominantScript === 'cyrillic' ? counts.latin : counts.cyrillic;
          return other >= 10 && other > counts[dominantScript] * 2;
        });
        if (exceedsLimit || wrongScript) {
          this.logger.warn(`Skipping question: ${exceedsLimit ? 'length limit exceeded' : 'language script differs from document'}`);
          continue;
        }
        const normalizedText = normalize(question.text);
        if (seenQuestions.has(normalizedText)) {
          this.logger.warn(`Skipping duplicate generated question: ${question.text}`);
          continue;
        }
        if (question.type === QuestionType.MultipleChoice) {
          const { correctOptionIndex, options, ...data } = question;
          const normalizedOptions = options.map(normalize);
          const optionSet = JSON.stringify([...normalizedOptions].sort());
          if (
            normalizedOptions.some((option) => !option) ||
            new Set(normalizedOptions).size !== options.length ||
            seenOptionSets.has(optionSet)
          ) {
            this.logger.warn(`Skipping question with repeated answer options: ${question.text}`);
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

      duplicateOnlyBatches =
        questions.length === previousCount ? duplicateOnlyBatches + 1 : 0;

      this.logger.debug(
        `Generated ${questions.length}/${questionCount} questions from excerpt ${chunkIndex + 1}/${chunks.length} (output tokens: ${usage?.outputTokens ?? 'unknown'})`,
      );
    }

    if (questions.length < questionCount) {
      this.logger.warn(`Generated ${questions.length}/${questionCount} questions after ${batchIndex} attempts`);
    }
    return questions;
  }

  private async getDocumentContent(jobId: string) {
    this.logger.debug(`Loading document content for job ${jobId}`);
    const row = await this.generationJobRepo
      .createQueryBuilder('job')
      .innerJoin('job.documents', 'document')
      .innerJoin(DocumentContents, 'content', 'content.id = document.id')
      .select('content.markdown', 'markdown')
      .where('job.id = :jobId', { jobId })
      .orderBy('document.createdAt', 'ASC')
      .limit(1)
      .getRawOne<{ markdown: string }>();

    if (!row) {
      throw new NotFoundProblem();
    }

    return row.markdown;
  }
}
