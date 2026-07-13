import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import type { DataField, TransformedChartData } from "../../types";
import { AccessibleChartTable } from "./EChartsRenderer";

const regionField: DataField = {
  id: "region",
  name: "region",
  label: "Region",
  type: "text",
  semanticType: "location",
  table: "sales",
  description: "Sales region",
  sampleValues: ["North"],
  isMeasure: false,
  isDimension: true,
  defaultAggregation: "None",
};

function createData(overrides: Partial<TransformedChartData> = {}): TransformedChartData {
  return {
    rows: [],
    filteredRows: [{ region: "North" }],
    seriesKeys: [],
    seriesLabels: {},
    pieRows: [],
    heatmapRows: [],
    treemapRows: [],
    funnelRows: [],
    waterfallRows: [],
    boxplotRows: [],
    sankeyNodes: [],
    sankeyLinks: [],
    sunburstRows: [],
    calendarRows: [],
    candlestickRows: [],
    graphNodes: [],
    graphLinks: [],
    parallelRows: [],
    parallelDimensions: [],
    pivotColumns: [],
    tableColumns: [regionField],
    tableRows: [{ region: "North" }],
    kpiValue: 0,
    kpiTrend: 0,
    kpiLabel: "",
    gaugePercent: 0,
    metadata: {
      chartType: "bar",
      rowCount: 1,
      filteredRowCount: 1,
      aggregation: "None",
    },
    ...overrides,
  };
}

describe("Dashboard V2 chart accessible data", () => {
  it("provides a compact table equivalent for graphical rows", () => {
    render(<AccessibleChartTable data={createData()} title="Revenue by region" />);

    const table = screen.getByRole("table", { name: "Data preview for Revenue by region" });
    expect(within(table).getByRole("columnheader", { name: "Region" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "North" })).toBeInTheDocument();
  });

  it("announces when active filters leave no chart rows", () => {
    render(
      <AccessibleChartTable
        data={createData({
          filteredRows: [],
          tableRows: [],
          metadata: {
            chartType: "bar",
            rowCount: 2,
            filteredRowCount: 0,
            aggregation: "None",
          },
        })}
        title="Revenue by region"
      />
    );

    expect(screen.getByRole("table", { name: "Data preview for Revenue by region" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("ไม่มีแถวข้อมูลที่ตรงกับตัวกรองสำหรับ Revenue by region");
  });
});
