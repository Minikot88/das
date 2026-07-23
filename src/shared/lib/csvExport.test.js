import { describe, expect, it } from "vitest";
import { buildCsv, escapeCsvCell } from "@shared/lib/csvExport";

describe("CSV export safety", () => {
  it.each(["=1+1", "+SUM(A1:A2)", "-cmd|' /C calc'!A0", "@SUM(A1:A2)", "  =1+1"])(
    "neutralizes spreadsheet formula text %s",
    (value) => {
      expect(escapeCsvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
    },
  );

  it("keeps numeric values and ordinary text unchanged", () => {
    expect(escapeCsvCell(-123)).toBe('"-123"');
    expect(escapeCsvCell("quarterly report")).toBe('"quarterly report"');
  });

  it("builds CSV with explicit keys and labels", () => {
    expect(buildCsv(
      [{ amount: "=1+1", region: "North" }],
      [{ key: "amount", label: "Amount" }, { key: "region", label: "Region" }],
    )).toBe('"Amount","Region"\n"\'=1+1","North"');
  });
});
