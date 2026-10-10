import { HttpException, HttpStatus } from '@nestjs/common';

interface ProblemResponse {
  title: string;
  instance?: string;
  status: number;
  detail?: string;
  extensions?: Record<string, unknown>;
  // TODO: add types description within URL resource
  // type: string;
}

type ProblemArgs = Partial<Pick<ProblemResponse, 'title' | 'status'>> &
  Omit<ProblemResponse, 'title' | 'status'>;

export class Problem extends HttpException {
  private readonly statusCode: number;
  public readonly title: string;
  public readonly instance?: string;
  public readonly extensions: Record<string, unknown>;

  constructor({
    title = 'Internal Server Error',
    status = 500,
    detail = 'Something went wrong while processing the request',
    instance = '/',
    extensions = {},
  }: ProblemArgs) {
    super(detail ?? title, HttpStatus.INTERNAL_SERVER_ERROR);
    this.title = title;
    this.statusCode = status;
    this.instance = instance;
    this.extensions = extensions;
  }
}

export class ConflictProblem extends Problem {
  constructor({
    title = 'Conflict',
    status = 409,
    ...problem
  }: ProblemArgs = {}) {
    super({ title, status, ...problem });
  }
}

export class NotFoundProblem extends Problem {
  constructor({
    title = 'Not Found',
    status = 404,
    ...problem
  }: ProblemArgs = {}) {
    super({ title, status, ...problem });
  }
}

export class UnauthorizedProblem extends Problem {
  constructor({
    title = 'Unauthorized',
    status = 401,
    ...problem
  }: ProblemArgs = {}) {
    super({ title, status, ...problem });
  }
}

export class UnprocessableProblem extends Problem {
  constructor({
    title = 'Unprocessable content',
    status = 422,
    ...problem
  }: ProblemArgs = {}) {
    super({ title, status, ...problem });
  }
}
