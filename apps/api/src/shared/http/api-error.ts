export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string>,
    readonly retryable = false,
    readonly currentRevision?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
