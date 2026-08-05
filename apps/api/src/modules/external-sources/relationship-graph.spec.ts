import { describe, expect, it } from 'vitest';
import { findShortestRelationshipPaths, type ForeignKeyEdge } from './relationship-graph.js';

const edges: ForeignKeyEdge[] = [
  { name: 'article_keywords_article', sourceSchema: 'scopus', sourceTable: 'sc_article_keywords', sourceColumn: 'article_id', targetSchema: 'scopus', targetTable: 'sc_articles', targetColumn: 'id' },
  { name: 'article_keywords_keyword', sourceSchema: 'scopus', sourceTable: 'sc_article_keywords', sourceColumn: 'keyword_id', targetSchema: 'scopus', targetTable: 'sc_keywords', targetColumn: 'id' },
  { name: 'article_journal', sourceSchema: 'scopus', sourceTable: 'sc_articles', sourceColumn: 'journal_id', targetSchema: 'scopus', targetTable: 'sc_journals', targetColumn: 'id' },
];

describe('relationship graph', () => {
  it('finds a shortest junction-table path using FK metadata in either direction', () => {
    expect(findShortestRelationshipPaths(edges, 'scopus', 'sc_articles', 'sc_keywords')).toEqual([[
      expect.objectContaining({ direction: 'incoming', columnName: 'id', referencedTable: 'sc_article_keywords', referencedColumn: 'article_id' }),
      expect.objectContaining({ direction: 'outgoing', columnName: 'keyword_id', referencedTable: 'sc_keywords', referencedColumn: 'id' }),
    ]]);
  });

  it('does not return a cyclic path or exceed the table limit', () => {
    expect(findShortestRelationshipPaths([...edges, { ...edges[0], name: 'cycle', sourceTable: 'sc_articles', sourceColumn: 'id', targetTable: 'sc_article_keywords', targetColumn: 'article_id' }], 'scopus', 'sc_articles', 'sc_keywords', 2)).toEqual([]);
  });
});
