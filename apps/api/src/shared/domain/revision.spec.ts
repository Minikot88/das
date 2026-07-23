import { describe, expect, it } from 'vitest';
import { assertRevision } from './revision.js';

describe('assertRevision', () => {
  it('throws a conflict carrying the current revision when a write is stale', () => {
    expect(() => assertRevision(3, 4)).toThrowError(expect.objectContaining({ status: 409, currentRevision: 4 }));
  });

  it('accepts an equal revision', () => {
    expect(() => assertRevision(4, 4)).not.toThrow();
  });
});
