import { describe, expect, it } from "vitest";
import { createDatasetFromCsv, parseCsvText, parseCsvTextAsync } from "./csvImport";

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
});
