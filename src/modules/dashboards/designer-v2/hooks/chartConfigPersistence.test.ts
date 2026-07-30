import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "@modules/dashboards/designer-v2/components/mockData";
import {
  createApiDesignerConfig,
  datasetSourceIdentity,
  normalizeConfig,
  serializeChartConfig,
} from "@modules/dashboards/designer-v2/hooks/useDashboardDesignerState";

describe("Chart Designer axis-title persistence", () => {
  it("normalizes PostgreSQL dataset context without a duplicate or leading schema separator", () => {
    expect(datasetSourceIdentity({
      name: "scopus.sc_affiliations",
      sourceConfigJson: { schemaName: "scopus", tableName: "sc_affiliations" },
    })).toEqual({
      schema: "scopus",
      table: "sc_affiliations",
      context: "scopus.sc_affiliations",
    });
  });

  it("round-trips titleMode and customTitle through the saved API config", () => {
    const config = createDefaultConfig();
    config.settings.axis.xTitle = { titleMode: "custom", customTitle: "เมืองที่ตั้ง" };
    config.settings.axis.yTitle = { titleMode: "custom", customTitle: "จำนวนสถาบัน" };

    const reloaded = normalizeConfig(serializeChartConfig(config));

    expect(reloaded.settings.axis.xTitle).toEqual({ titleMode: "custom", customTitle: "เมืองที่ตั้ง" });
    expect(reloaded.settings.axis.yTitle).toEqual({ titleMode: "custom", customTitle: "จำนวนสถาบัน" });
  });

  it("starts API mode without stale demo labels or mappings", () => {
    const config = createApiDesignerConfig();
    const renderedDefaults = JSON.stringify(config);
    expect(config.datasetId).toBe("");
    expect(config.mappings.every((mapping) => mapping.fields.length === 0)).toBe(true);
    expect(renderedDefaults).not.toContain("sales_performance");
    expect(renderedDefaults).not.toContain("ยอดขาย");
    expect(renderedDefaults).not.toContain("เดือน");
  });

  it("migrates saved charts without title-mode state to automatic titles", () => {
    const config = createDefaultConfig();
    const serialized = serializeChartConfig(config);
    delete (serialized.settings.axis as Partial<typeof serialized.settings.axis>).xTitle;
    delete (serialized.settings.axis as Partial<typeof serialized.settings.axis>).yTitle;

    const reloaded = normalizeConfig(serialized);

    expect(reloaded.settings.axis.xTitle.titleMode).toBe("auto");
    expect(reloaded.settings.axis.yTitle.titleMode).toBe("auto");
  });
});
