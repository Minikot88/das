import { describe, expect, it } from "vitest";
import { defaultChartSettings } from "@modules/dashboards/designer-v2/components/mockData";
import { buildCartesianGridOption } from "@modules/dashboards/designer-v2/components/utils/echartsOptionBuilder";

describe("ECharts grid options", () => {
  it("uses the ECharts 6 outer-bounds API instead of legacy containLabel", () => {
    const grid = buildCartesianGridOption(defaultChartSettings);

    expect(grid).not.toHaveProperty("containLabel");
    expect(grid).toMatchObject({
      outerBoundsMode: "same",
      outerBoundsContain: "axisLabel",
    });
  });
});
