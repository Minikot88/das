import { describe, expect, it } from "vitest";
import { createTableAlias, relationToJoin, toQualifiedFields } from "./multiTableDataset";

describe("multi-table dataset helpers", () => {
  it("creates readable unique aliases without hardcoded table names", () => {
    expect(createTableAlias("sc_articles", [])).toBe("articles");
    expect(createTableAlias("sc_articles", ["articles"])).toBe("articles_2");
  });

  it("turns PostgreSQL FK metadata into a validated join definition", () => {
    expect(relationToJoin(
      { schema: "scopus", table: "sc_articles", alias: "articles" },
      { schema: "scopus", table: "sc_journals", alias: "journals" },
      { columnName: "journal_id", referencedSchema: "scopus", referencedTable: "sc_journals", referencedColumn: "id" },
    )).toMatchObject({
      left: { alias: "articles", column: "journal_id" },
      right: { alias: "journals", column: "id" },
      joinType: "left",
      automatic: true,
    });
  });

  it("keeps physical and semantic types on fully-qualified fields", () => {
    const fields = toQualifiedFields(
      { schema: "scopus", table: "sc_articles", alias: "articles" },
      [{ name: "id", dataType: "bigint", nullable: false, primaryKey: true, foreignKeys: [] }],
    );
    expect(fields[0]).toMatchObject({
      id: "articles_id",
      name: "articles.id",
      physicalType: "bigint",
      semanticType: "category",
      defaultAggregation: "Count",
      sourceAlias: "articles",
    });
  });
});
