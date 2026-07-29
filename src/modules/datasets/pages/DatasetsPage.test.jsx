import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DatasetsPage from "@modules/datasets/pages/DatasetsPage";

const datasets = [
  { id: "dataset-a", projectId: "project-a", name: "Project A dataset", revision: 1, fields: [], rows: [] },
  { id: "dataset-b", projectId: "project-b", name: "Project B dataset", revision: 1, fields: [], rows: [] },
];
const storeState = {
  importedDatasets: datasets,
  activeProjectId: "project-a",
  importDataset: vi.fn(),
  deleteImportedDataset: vi.fn(),
  appSettings: { density: "comfortable" },
};

vi.mock("@app/store/useStore", () => ({
  useStore: (selector) => selector(storeState),
}));

vi.mock("@modules/projects", () => ({
  API_ACTIVE_PROJECT_KEY: "mini-bi-api-active-project-id",
  getProjects: vi.fn(async () => [{ id: "project-a", name: "Project A" }]),
  resolveApiActiveProject: (projects, preferredProjectId, activeProjectId) =>
    projects.find((project) => project.id === preferredProjectId)
      ?? projects.find((project) => project.id === activeProjectId)
      ?? projects[0]
      ?? null,
}));

vi.mock("@modules/datasets/api/datasetApi", () => ({
  listDatasets: vi.fn(async ({ projectId }) => ({
    items: datasets.filter((dataset) => dataset.projectId === projectId),
    total: 1,
    page: 1,
    pageSize: 100,
  })),
  getDatasetFields: vi.fn(async () => []),
  queryDataset: vi.fn(async () => ({ rows: [], total: 0 })),
  importDatasetCsv: vi.fn(),
  archiveDataset: vi.fn(),
  listExternalSources: vi.fn(async () => ({ items: [{ schemaName: "scopus", displayName: "Scopus" }] })),
  listExternalTables: vi.fn(async () => ({ items: [{ name: "sc_articles", rowCountEstimate: 10 }, { name: "sc_authors", rowCountEstimate: 4 }] })),
  listExternalColumns: vi.fn(async () => ({ items: [{ name: "id", dataType: "uuid", primaryKey: true }] })),
  previewExternalSource: vi.fn(async () => ({ rows: [{ id: "article-1" }] })),
  createExternalDataset: vi.fn(async () => ({ id: "dataset-scopus" })),
  renameDataset: vi.fn(async () => ({ id: "dataset-a", name: "Renamed catalog", revision: 2 })),
}));

vi.mock("@shared/components/ui/EnterpriseDataTable", () => ({ default: () => null }));

describe("DatasetsPage project ownership", () => {
  it("shows datasets returned by the active project API only", async () => {
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);

    expect((await screen.findAllByText("Project A dataset")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Project B dataset")).not.toBeInTheDocument();
  });

  it("keeps the live external source controls available beside API-backed datasets", async () => {
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);

    expect(await screen.findByRole("region", { name: "PostgreSQL external source browser" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Schema" })).toHaveValue("scopus"));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Table" })).toHaveValue("sc_articles"));
    expect(screen.getByRole("button", { name: "Create live dataset" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Create live dataset" }));
    expect(await screen.findByRole("button", { name: "Create chart" })).toBeInTheDocument();
  });

  it("lists every table in each allowed schema and selects one for live preview", async () => {
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);
    expect(await screen.findByRole("tree", { name: "External schema tables" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /sc_articles/ })).toBeInTheDocument();
    const authors = await screen.findByRole("button", { name: /sc_authors/ });
    fireEvent.click(authors);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Table" })).toHaveValue("sc_authors"));
  });

  it("renames only the selected catalog metadata through the API", async () => {
    const api = await import("@modules/datasets/api/datasetApi");
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);
    const input = await screen.findByRole("textbox", { name: "Catalog dataset name" });
    fireEvent.change(input, { target: { value: "Renamed catalog" } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    await waitFor(() => expect(api.renameDataset).toHaveBeenCalledWith("dataset-a", { name: "Renamed catalog", revision: 1 }));
  });
});
