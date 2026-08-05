import { describe, expect, it } from 'vitest';
import { buildStructuredExternalQuery, type StructuredQueryMetadata } from './structured-query.js';

const metadata: StructuredQueryMetadata = {
  allowedSchemas: new Set(['scopus']),
  tables: {
    articles: {
      schema: 'scopus',
      table: 'sc_articles',
      columns: {
        id: { dataType: 'bigint', nullable: false, primaryKey: true },
        journal_id: { dataType: 'bigint', nullable: true, primaryKey: false },
        publication_year: { dataType: 'integer', nullable: true, primaryKey: false },
        cited_by_count: { dataType: 'integer', nullable: true, primaryKey: false },
        title: { dataType: 'text', nullable: true, primaryKey: false },
      },
    },
    journals: {
      schema: 'scopus',
      table: 'sc_journals',
      columns: {
        id: { dataType: 'bigint', nullable: false, primaryKey: true },
        name: { dataType: 'character varying', nullable: true, primaryKey: false },
      },
    },
  },
};

describe('structured external query builder', () => {
  it('builds a parameterized two-table LEFT JOIN with qualified fields', () => {
    const result = buildStructuredExternalQuery({
      sourceSchema: 'scopus',
      baseTable: 'sc_articles',
      selectedTables: [
        { schema: 'scopus', table: 'sc_articles', alias: 'articles' },
        { schema: 'scopus', table: 'sc_journals', alias: 'journals' },
      ],
      selectedFields: [
        { tableAlias: 'articles', column: 'publication_year', alias: 'publication_year' },
        { tableAlias: 'journals', column: 'name', alias: 'journal_name' },
      ],
      joins: [{
        left: { schema: 'scopus', table: 'sc_articles', alias: 'articles', column: 'journal_id' },
        right: { schema: 'scopus', table: 'sc_journals', alias: 'journals', column: 'id' },
        operator: 'eq',
        joinType: 'left',
      }],
      filters: [{ field: { tableAlias: 'articles', column: 'publication_year' }, operator: 'gte', value: 2020 }],
      rowLimit: 200,
    }, metadata);

    expect(result.text).toContain('FROM "scopus"."sc_articles" AS "articles"');
    expect(result.text).toContain('LEFT JOIN "scopus"."sc_journals" AS "journals" ON "articles"."journal_id" = "journals"."id"');
    expect(result.text).toContain('"articles"."publication_year" >= $1');
    expect(result.values).toEqual([2020, 200, 0]);
  });

  it('rejects a selected table without a validated join', () => {
    expect(() => buildStructuredExternalQuery({
      sourceSchema: 'scopus',
      baseTable: 'sc_articles',
      selectedTables: [
        { schema: 'scopus', table: 'sc_articles', alias: 'articles' },
        { schema: 'scopus', table: 'sc_journals', alias: 'journals' },
      ],
      selectedFields: [{ tableAlias: 'journals', column: 'name' }],
      joins: [],
    }, metadata)).toThrowError(expect.objectContaining({ code: 'MISSING_JOIN' }));
  });

  it('rejects join cycles instead of emitting a duplicate table alias', () => {
    expect(() => buildStructuredExternalQuery({
      sourceSchema: 'scopus',
      baseTable: 'sc_articles',
      selectedTables: [
        { schema: 'scopus', table: 'sc_articles', alias: 'articles' },
        { schema: 'scopus', table: 'sc_journals', alias: 'journals' },
      ],
      selectedFields: [],
      joins: [
        {
          left: { schema: 'scopus', table: 'sc_articles', alias: 'articles', column: 'journal_id' },
          right: { schema: 'scopus', table: 'sc_journals', alias: 'journals', column: 'id' },
          joinType: 'left',
        },
        {
          left: { schema: 'scopus', table: 'sc_journals', alias: 'journals', column: 'id' },
          right: { schema: 'scopus', table: 'sc_articles', alias: 'articles', column: 'journal_id' },
          joinType: 'inner',
        },
      ],
    }, metadata)).toThrowError(expect.objectContaining({ code: 'JOIN_CYCLE' }));
  });

  it('rejects incompatible manual join column types', () => {
    expect(() => buildStructuredExternalQuery({
      sourceSchema: 'scopus',
      baseTable: 'sc_articles',
      selectedTables: [
        { schema: 'scopus', table: 'sc_articles', alias: 'articles' },
        { schema: 'scopus', table: 'sc_journals', alias: 'journals' },
      ],
      selectedFields: [],
      joins: [{
        left: { schema: 'scopus', table: 'sc_articles', alias: 'articles', column: 'title' },
        right: { schema: 'scopus', table: 'sc_journals', alias: 'journals', column: 'id' },
        operator: 'eq',
        joinType: 'inner',
      }],
    }, metadata)).toThrowError(expect.objectContaining({ code: 'INCOMPATIBLE_JOIN_TYPES' }));
  });

  it('uses guarded safe casts and structured calculated fields without raw SQL', () => {
    const result = buildStructuredExternalQuery({
      sourceSchema: 'scopus',
      baseTable: 'sc_articles',
      selectedTables: [{ schema: 'scopus', table: 'sc_articles', alias: 'articles' }],
      selectedFields: [{
        tableAlias: 'articles',
        column: 'title',
        alias: 'title_as_number',
        cast: { targetType: 'numeric' },
      }],
      calculatedFields: [{
        name: 'citation_ratio',
        resultType: 'percentage',
        expression: {
          kind: 'ratio',
          numerator: { tableAlias: 'articles', column: 'cited_by_count' },
          denominator: { tableAlias: 'articles', column: 'id' },
        },
      }],
    }, metadata);

    expect(result.text).toContain('CASE WHEN "articles"."title"::text ~');
    expect(result.text).toContain('NULLIF("articles"."id", 0)');
    expect(result.text).not.toContain('DROP');
  });

  it('rejects raw SQL and more than six selected tables', () => {
    expect(() => buildStructuredExternalQuery({
      sourceSchema: 'scopus',
      baseTable: 'sc_articles',
      selectedTables: Array.from({ length: 7 }, (_, index) => ({
        schema: 'scopus',
        table: 'sc_articles',
        alias: `t${index}`,
      })),
      selectedFields: [],
      rawSql: 'SELECT * FROM scopus.sc_articles',
    } as never, metadata)).toThrowError(expect.objectContaining({ code: 'RAW_SQL_FORBIDDEN' }));
  });

  it('rejects a numeric aggregation on a text field with a reader-friendly qualified error', () => {
    expect(() => buildStructuredExternalQuery({
      sourceSchema: 'scopus',
      baseTable: 'sc_articles',
      selectedTables: [{ schema: 'scopus', table: 'sc_articles', alias: 'articles' }],
      selectedFields: [],
      aggregations: [{ field: { tableAlias: 'articles', column: 'title' }, operation: 'sum' }],
    }, metadata)).toThrowError(expect.objectContaining({
      code: 'INVALID_AGGREGATION_TYPE',
      message: expect.stringContaining('articles.title'),
    }));
  });
});
