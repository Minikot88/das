import { describe, expect, it } from 'vitest';
import { validateReadOnlySql } from './query-policy.js';

describe('validateReadOnlySql', () => {
  it.each(['DELETE FROM sales', 'DROP TABLE sales', 'SELECT 1; SELECT 2', 'BEGIN'])('rejects unsafe SQL: %s', sql => {
    expect(() => validateReadOnlySql(sql)).toThrow();
  });

  it('accepts one read-only select statement', () => {
    expect(validateReadOnlySql('SELECT region, SUM(sales) FROM sales GROUP BY region')).toEqual({
      normalizedSql: 'SELECT region, SUM(sales) FROM sales GROUP BY region',
    });
  });
});
