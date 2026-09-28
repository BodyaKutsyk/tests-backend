export class Worker {
  private _count = 0;
  private readonly id: string | number;
  private executionTime = 0;

  constructor(id: string | number) {
    this.id = id;
  }

  get count() {
    return this._count;
  }

  async run(cb: () => Promise<boolean>) {
    const startOfExecution = new Date().getTime();
    while (true) {
      console.log(`[worker-${this.id}] attempt`);

      const result = await cb();

      if (result) {
        this._count++;
      } else {
        break;
      }
    }
    this.executionTime = (new Date().getTime() - startOfExecution) / 1000;
    this.reportOperation();

    return this;
  }

  reportOperation() {
    console.log(
      `[worker-${this.id} | ${this.executionTime}s] did total operations: ${this._count}`,
    );
    return this;
  }
}
