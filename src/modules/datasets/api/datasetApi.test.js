import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const mockMode = vi.fn(() => false);
const getState = vi.fn(() => ({ activeProjectId: "project-1" }));

vi.mock("@infrastructure/http/client", () => ({
  apiRequest,
  encodeApiPathSegment: encodeURIComponent,
  isMockMode: mockMode,
}));
vi.mock("@app/store/useStore", () => ({ useStore: { getState } }));
vi.mock("@infrastructure/mock/mockData", () => ({ mockDataset: { id: "mock", fields: [], rows: [] } }));

describe("datasetApi production repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMode.mockReturnValue(false);
  });

  it("loads list, detail, fields and preview through /api/v1 without fallback", async () => {
    apiRequest
      .mockResolvedValueOnce({ items: [{ id: "dataset-1" }], total: 1 })
      .mockResolvedValueOnce({ id: "dataset-1", name: "Sales" })
      .mockResolvedValueOnce([{ fieldKey: "amount", name: "Amount", dataType: "number" }])
      .mockResolvedValueOnce({ rows: [{ amount: 10 }], total: 1 });
    const { loadDefaultProjectDataset } = await import("./datasetApi");
    const dataset = await loadDefaultProjectDataset();
    expect(dataset.rows).toEqual([{ amount: 10 }]);
    expect(dataset.fields[0]).toMatchObject({ name: "amount", type: "number" });
    expect(apiRequest.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/datasets?projectId=project-1&page=1&pageSize=1",
      "/api/v1/datasets/dataset-1",
      "/api/v1/datasets/dataset-1/fields",
      "/api/v1/datasets/dataset-1/query",
    ]);
  });

  it("propagates API failures and never replaces them with demo data", async () => {
    apiRequest.mockRejectedValueOnce(new Error("backend unavailable"));
    const { listDatasets } = await import("./datasetApi");
    await expect(listDatasets()).rejects.toThrow("backend unavailable");
  });

  it("sends the loaded revision when archiving a dataset", async () => {
    apiRequest.mockResolvedValue({ success: true });
    const { archiveDataset } = await import("./datasetApi");
    await archiveDataset("dataset-1", 3);
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/datasets/dataset-1", {
      method: "DELETE",
      body: JSON.stringify({ revision: 3 }),
    });
  });

  it("renames application catalog metadata through the API", async () => {
    apiRequest.mockResolvedValue({ id: "dataset-1", name: "Scopus affiliations", revision: 4 });
    const { renameDataset } = await import("./datasetApi");
    await renameDataset("dataset-1", { name: "Scopus affiliations", revision: 3 });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/datasets/dataset-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Scopus affiliations", revision: 3 }),
    });
  });

  it("normalizes PostgreSQL field types for chart role validation", async () => {
    apiRequest.mockResolvedValueOnce([
      { fieldKey: "year", dataType: "integer" },
      { fieldKey: "title", dataType: "text" },
      { fieldKey: "published_at", dataType: "timestamp without time zone" },
    ]);
    const { getDatasetFields } = await import("./datasetApi");
    await expect(getDatasetFields("dataset-1")).resolves.toEqual([
      expect.objectContaining({ name: "year", type: "number", sourceType: "integer" }),
      expect.objectContaining({ name: "title", type: "string", sourceType: "text" }),
      expect.objectContaining({ name: "published_at", type: "date", sourceType: "timestamp without time zone" }),
    ]);
  });

  it("loads real table constraints, foreign keys and indexes from the metadata endpoint", async () => {
    apiRequest.mockResolvedValueOnce({ constraints: [], foreignKeys: [], indexes: [] });
    const { listExternalMetadata } = await import("./datasetApi");
    await listExternalMetadata("scopus", "sc_articles", "project-1");
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/external-sources/scopus/tables/sc_articles/metadata?projectId=project-1",
    );
  });
});
