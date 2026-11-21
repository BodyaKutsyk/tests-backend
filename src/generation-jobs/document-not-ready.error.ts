export class DocumentNotReadyError extends Error {
  constructor(jobId: string) {
    super(`Documents are not ready for generation job ${jobId}`);
    this.name = DocumentNotReadyError.name;
  }
}
