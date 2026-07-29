import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DatasetsPage from "@modules/datasets/pages/DatasetsPage";

const datasets = [
  { id: "dataset-a", projectId: "project-a", name: "Project A dataset", fields: [], rows: [] },
  { id: "dataset-b", projectId: "project-b", name: "Project B dataset", fields: [], rows: [] },
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
  listExternalSources: vi.fn(async () => ({ items: [] })),
  listExternalTables: vi.fn(async () => ({ items: [] })),
  listExternalColumns: vi.fn(async () => ({ items: [] })),
  previewExternalSource: vi.fn(async () => ({ rows: [] })),
  createExternalDataset: vi.fn(),
}));

vi.mock("@shared/components/ui/EnterpriseDataTable", () => ({ default: () => null }));

describe("DatasetsPage project ownership", () => {
  it("shows datasets returned by the active project API only", async () => {
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);

    expect((await screen.findAllByText("Project A dataset")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Project B dataset")).not.toBeInTheDocument();
  });
});
