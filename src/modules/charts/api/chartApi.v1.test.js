import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@infrastructure/http/client", () => ({
  apiRequest,
  encodeApiPathSegment: encodeURIComponent,
  isMockMode: () => false,
}));
vi.mock("@infrastructure/mock/mockData", () => ({ mockData: {}, mockRows: [] }));
vi.mock("@modules/charts/data/mockSchema", () => ({ mockSchema: [] }));
vi.mock("@modules/charts/lib/chartTemplates", () => ({
  chartJsTemplates: [],
  getChartJsTemplateById: () => ({ defaultSettings: {}, defaultMapping: {}, id: "bar", name: "Bar", type: "bar" }),
  getChartTypes: () => [],
}));
vi.mock("@modules/charts/lib/chartCompatibility", () => ({
  getChartValidationMessage: () => "",
  validateChartMapping: () => true,
}));
vi.mock("@modules/charts/lib/chartFactory", () => ({ createChartConfig: () => ({}) }));
vi.mock("@modules/charts/lib/mockSqlEngine", () => ({
  executeMockSql: () => ({ rows: [] }),
  generateVisualSql: () => "",
}));
vi.mock("@shared/lib/id", () => ({ createEntityId: () => "chart-test" }));
vi.mock("@app/store/useStore", () => ({ useStore: { getState: () => ({ charts: [] }) } }));
vi.mock("@modules/datasets/public/api", () => ({ loadDefaultProjectDataset: vi.fn() }));

describe("chart API v1 repository", () => {
  beforeEach(() => apiRequest.mockReset());

  it("scopes chart listings to the active project", async () => {
    apiRequest.mockResolvedValue([]);
    const { getCharts } = await import("./chartApi");

    await getCharts("project-1");

    expect(apiRequest).toHaveBeenCalledWith("/api/v1/charts?projectId=project-1");
  });
});
