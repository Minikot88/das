import { describe, expect, it } from "vitest";
import { CSV_IMPORT_LIMITS, createDatasetFromCsv, parseCsvText, parseCsvTextAsync, validateCsvFile } from "@modules/datasets/lib/csvImport";

describe("CSV import utilities", () => {
  it("parses quoted CSV values, infers types, and creates datasets", () => {
    const parsed = parseCsvText('Region,Sales,Date\n"North, East","1,200",2026-06-15\nSouth,90,2026-06-16');
    expect(parsed.validation.valid).toBe(true);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].region).toBe("North, East");
    expect(parsed.fields.find((field) => field.name === "sales")?.type).toBe("number");

    const dataset = createDatasetFromCsv({ name: "Revenue", fileName: "revenue.csv", parsed });
    expect(dataset.name).toBe("Revenue");
    expect(dataset.rowCount).toBe(2);
  });

  it("supports async parsing fallback", async () => {
    const parsed = await parseCsvTextAsync("Name,Value\nA,10\nB,20");
    expect(parsed.rows.map((row) => row.value)).toEqual([10, 20]);
  });

  it("renames duplicate normalized headers without overwriting cell values", () => {
    const parsed = parseCsvText("Name,name,Name!\nAlice,Bob,Carol");

    expect(parsed.headers).toEqual(["name", "name_2", "name_3"]);
    expect(parsed.rows[0]).toMatchObject({ name: "Alice", name_2: "Bob", name_3: "Carol" });
    expect(parsed.validation.warnings).toContain("Duplicate column names were renamed: name → name_2, name → name_3.");
  });

  it("avoids collisions with suffixes that already exist in the source headers", () => {
    const parsed = parseCsvText("Name,Name_2,Name\nAlice,Bob,Carol");

    expect(parsed.headers).toEqual(["name", "name_2", "name_3"]);
    expect(parsed.rows[0]).toMatchObject({ name: "Alice", name_2: "Bob", name_3: "Carol" });
    expect(Object.keys(parsed.rows[0])).toHaveLength(4);
  });

  it("parses multiline quoted records and escaped quotes", () => {
    const parsed = parseCsvText('Name,Notes\nAlice,"Line one\nLine two"\nBob,"Said ""hello"""');

    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].notes).toBe("Line one\nLine two");
    expect(parsed.rows[1].notes).toBe('Said "hello"');
  });

  it("handles BOM, semicolon delimiters, empty cells, and blank lines", () => {
    const parsed = parseCsvText("\uFEFFName;Amount;Note\r\nAlice;10;\r\n\r\nBob;;ok");

    expect(parsed.delimiter).toBe(";");
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({ name: "Alice", amount: 10, note: "" });
    expect(parsed.rows[1]).toMatchObject({ name: "Bob", amount: "", note: "ok" });
  });

  it("reports records whose column count differs from the header", () => {
    const parsed = parseCsvText("Name,Amount\nAlice,10,extra\nBob");

    expect(parsed.validation.valid).toBe(false);
    expect(parsed.validation.errors).toEqual([
      "Record 2 has 3 columns; expected 2.",
      "Record 3 has 1 column; expected 2.",
    ]);
  });

  it("rejects unterminated quoted records", () => {
    expect(() => parseCsvText('Name,Notes\nAlice,"unfinished')).toThrow("CSV contains an unterminated quoted field.");
  });

  it("enforces file, row, and column limits", () => {
    expect(() => parseCsvText("Name\nAlice", { limits: { ...CSV_IMPORT_LIMITS, maxFileBytes: 4 } })).toThrow(
      "CSV file exceeds the 4 byte limit.",
    );
    expect(() => parseCsvText("Name\nA\nB", { limits: { ...CSV_IMPORT_LIMITS, maxRows: 1 } })).toThrow(
      "CSV contains more than 1 data row.",
    );
    expect(() => parseCsvText("A,B,C\n1,2,3", { limits: { ...CSV_IMPORT_LIMITS, maxColumns: 2 } })).toThrow(
      "CSV contains 3 columns; the limit is 2.",
    );
  });

  it("cancels safely before parsing work starts", () => {
    expect(() => parseCsvText("Name\nAlice", { signal: { aborted: true } })).toThrow("CSV import was cancelled.");
  });

  it("creates stable project-owned dataset ids for identical imports", () => {
    const parsed = parseCsvText("Name,Value\nA,10");
    const input = { name: "Metrics", fileName: "metrics.csv", parsed, projectId: "project-1" };

    const first = createDatasetFromCsv(input);
    const second = createDatasetFromCsv(input);

    expect(first.id).toBe(second.id);
    expect(first.id).toMatch(/^dataset-csv-/);
    expect(first.projectId).toBe("project-1");
  });

  it("applies limits consistently through the async fallback", async () => {
    await expect(parseCsvTextAsync("Name\nA\nB", {
      limits: { ...CSV_IMPORT_LIMITS, maxRows: 1 },
    })).rejects.toThrow("CSV contains more than 1 data row.");
  });

  it("rejects oversized files before their contents are read", () => {
    expect(() => validateCsvFile({ name: "large.csv", size: CSV_IMPORT_LIMITS.maxFileBytes + 1 })).toThrow(
      `CSV file exceeds the ${CSV_IMPORT_LIMITS.maxFileBytes} byte limit.`,
    );
  });
});
