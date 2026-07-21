import { describe, expect, it } from "vitest";
import { defaultChartSettings } from "@modules/dashboards/designer-v2/components/mockData";
import { buildCartesianGridOption, sanitizeChartColor } from "@modules/dashboards/designer-v2/components/utils/echartsOptionBuilder";

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

describe("ECharts color safety", () => {
  it.each([
    "red;background-image:url(https://attacker.example/collect)",
    "url(https://attacker.example/collect)",
    "#fff\" onmouseover=alert(1)",
    "#fff\nbackground:red",
  ])("rejects injected CSS color value %s", (value) => {
    expect(sanitizeChartColor(value, "#2563EB")).toBe("#2563EB");
  });

  it.each(["#2563EB", "#fff", "rgb(10, 20, 30)", "rgba(10,20,30,0.5)", "transparent"])(
    "keeps supported color %s",
    (value) => expect(sanitizeChartColor(value, "#000000")).toBe(value),
  );
});
