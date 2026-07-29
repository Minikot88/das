import { describe, expect, it } from "vitest";
import {
  ensureEChartsChartModule,
  isEChartsChartModuleReady,
} from "@modules/dashboards/designer-v2/components/utils/echartsModules";

describe("ECharts module loading", () => {
  it("keeps common charts ready without an additional request", () => {
    expect(isEChartsChartModuleReady("bar")).toBe(true);
    expect(isEChartsChartModuleReady("line")).toBe(true);
    expect(isEChartsChartModuleReady("pie")).toBe(true);
  });

  it("loads a specialized chart renderer once and reuses it", async () => {
    const firstLoad = ensureEChartsChartModule("radar");
    const repeatedLoad = ensureEChartsChartModule("radar");

    expect(repeatedLoad).toBe(firstLoad);
    await firstLoad;
    expect(isEChartsChartModuleReady("radar")).toBe(true);
  });
});
