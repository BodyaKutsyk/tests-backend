import { Worker } from './worker.js';

export class WorkersManager {
  private readonly workersAmount: number;

  constructor(amount: number) {
    this.workersAmount = amount;
  }
  async run(cb: () => Promise<boolean>) {
    const jobs = Array.from({ length: this.workersAmount }, (_, id) =>
      new Worker(id + 1).run(cb),
    );

    return await Promise.all(jobs);
  }
}
