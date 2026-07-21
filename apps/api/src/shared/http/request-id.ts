import { randomUUID } from 'node:crypto';

export function ensureRequestId<T extends object>(request: T): string {
  const requestWithId = request as T & { requestId?: string };
  requestWithId.requestId ||= randomUUID();
  return requestWithId.requestId;
}
