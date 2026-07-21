export class RevisionConflictError extends Error {
  readonly status = 409;
  readonly code = 'REVISION_CONFLICT';

  constructor(readonly currentRevision: number) {
    super('The entity was changed by another request.');
    this.name = 'RevisionConflictError';
  }
}

export function assertRevision(baseRevision: number, currentRevision: number): void {
  if (!Number.isInteger(baseRevision) || baseRevision < 0 || baseRevision !== currentRevision) {
    throw new RevisionConflictError(currentRevision);
  }
}
