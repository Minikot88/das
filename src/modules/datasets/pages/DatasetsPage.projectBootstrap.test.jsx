import React from "react";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DatasetsPage from "./DatasetsPage";

const mocks = vi.hoisted(() => ({
  activeProjectId: "project-1",
  getProjects: vi.fn(),
  listDatasets: vi.fn(),
  listExternalSources: vi.fn(),
  setState: vi.fn(),
}));

vi.mock("@app/store/useStore", () => {
  const useStore = (selector) => selector({
    activeProjectId: mocks.activeProjectId,
    appSettings: { density: "comfortable" },
  });
  useStore.setState = mocks.setState;
  useStore.getState = () => ({ activeProjectId: mocks.activeProjectId });
  return { useStore };
});

vi.mock("@modules/projects", () => ({
  API_ACTIVE_PROJECT_KEY: "mini-bi-api-active-project-id",
  getProjects: mocks.getProjects,
  resolveApiActiveProject: (projects, preferredProjectId, activeProjectId) =>
    projects.find((project) => project.id === preferredProjectId)
      ?? projects.find((project) => project.id === activeProjectId)
      ?? projects[0]
      ?? null,
}));

vi.mock("@modules/datasets/api/datasetApi", () => ({
  listDatasets: mocks.listDatasets,
  getDatasetFields: vi.fn(async () => []),
  queryDataset: vi.fn(async () => ({ rows: [], total: 0 })),
  importDatasetCsv: vi.fn(),
  archiveDataset: vi.fn(),
  listExternalSources: mocks.listExternalSources,
  listExternalTables: vi.fn(async () => ({ items: [] })),
  listExternalColumns: vi.fn(async () => ({ items: [] })),
  previewExternalSource: vi.fn(async () => ({ rows: [] })),
  createExternalDataset: vi.fn(),
}));

vi.mock("@shared/components/ui/EnterpriseDataTable", () => ({ default: () => null }));

describe("DatasetsPage API project bootstrap", () => {
  beforeEach(() => {
    mocks.activeProjectId = "project-1";
    mocks.getProjects.mockReset().mockResolvedValue([{ id: "project-real", name: "Real project" }]);
    mocks.listDatasets.mockReset().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 });
    mocks.listExternalSources.mockReset().mockResolvedValue({ items: [] });
    mocks.setState.mockReset();
    window.localStorage.clear();
  });

  it("resolves a real API project before requesting datasets or external sources", async () => {
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);

    await waitFor(() => expect(mocks.listDatasets).toHaveBeenCalledWith({ projectId: "project-real" }));
    expect(mocks.listExternalSources).toHaveBeenCalledWith("project-real");
    expect(mocks.listDatasets).not.toHaveBeenCalledWith({ projectId: "project-1" });
    expect(mocks.listExternalSources).not.toHaveBeenCalledWith("project-1");
    expect(mocks.setState).toHaveBeenCalledWith({ activeProjectId: "project-real" });
  });
});
