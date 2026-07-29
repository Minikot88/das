import { afterEach, describe, expect, it, vi } from "vitest";
import { createValidWorkspaceFixture } from "@domain/workspace/__fixtures__/workspaceFixtures";
import {
  getDatasetRows,
  getDatasetSchema,
  getDatasources,
} from "@modules/dashboards/designer-v2/components/services/datasetService";

describe("dashboard designer dataset service", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });
  it("adds active-project canonical datasets to the explicit demo catalog", () => {
    const workspace = createValidWorkspaceFixture();

    const datasources = getDatasources(workspace);

    expect(datasources.some((datasource) => datasource.id === "dataset-1")).toBe(true);
    expect(datasources.find((datasource) => datasource.id === "dataset-1")).toMatchObject({
      name: "Revenue",
      table: "dataset-1",
      rowCount: 1,
      fieldCount: 1,
    });
  });

  it("returns the imported dataset's exact rows rather than demo rows", () => {
    const workspace = createValidWorkspaceFixture();

    const rows = getDatasetRows("dataset-1", workspace);
    rows[0].region = "Changed clone";

    expect(rows).toHaveLength(1);
    expect(workspace.projects[0].datasets[0].rows).toEqual([{ id: "row-1", region: "North" }]);
  });

  it("maps canonical fields into designer schema metadata", () => {
    const workspace = createValidWorkspaceFixture();

    const schema = getDatasetSchema("dataset-1", workspace);

    expect(schema).toMatchObject({
      available: true,
      datasourceId: "dataset-1",
      datasetId: "dataset-1",
      database: "local",
      schema: "project-1",
      table: "dataset-1",
    });
    expect(schema.fields[0]).toMatchObject({
      id: "region",
      label: "Region",
      type: "text",
      isMeasure: false,
      isDimension: true,
    });
  });

  it("returns an explicit unavailable result for unknown datasets", () => {
    const workspace = createValidWorkspaceFixture();

    expect(getDatasetRows("missing-dataset", workspace)).toEqual([]);
    expect(getDatasetSchema("missing-dataset", workspace)).toMatchObject({
      available: false,
      datasetId: "missing-dataset",
      fields: [],
      message: "Dataset missing-dataset is unavailable.",
    });
  });

  it("uses demo rows only when mock mode is explicitly enabled", async () => {
    vi.stubEnv("VITE_USE_MOCK", "true");
    vi.resetModules();
    const service = await import("@modules/dashboards/designer-v2/components/services/datasetService");
    const workspace = createValidWorkspaceFixture();

    expect(service.getDatasetRows("sales_performance", workspace).length).toBeGreaterThan(1);
  });

  it("does not expose demo datasets when mock mode is explicitly disabled", async () => {
    vi.stubEnv("VITE_USE_MOCK", "false");
    vi.resetModules();
    const service = await import("@modules/dashboards/designer-v2/components/services/datasetService");
    const workspace = createValidWorkspaceFixture();

    expect(service.getDatasources(workspace).some((datasource) => datasource.sourceType === "demo")).toBe(false);
    expect(service.getDatasetRows("sales_performance", workspace)).toEqual([]);
    expect(service.getDatasetSchema("sales_performance", workspace)).toMatchObject({ available: false, fields: [] });
  });
});
