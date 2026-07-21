import { describe, expect, it } from "vitest";
import { defaultChartSettings } from "@/components/dashboard-v2/mockData";
import { buildCartesianGridOption } from "@/components/dashboard-v2/utils/echartsOptionBuilder";

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
