import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import DatasetsPage from "@modules/datasets/pages/DatasetsPage";

const datasets = [
  {
    id: "dataset-a",
    projectId: "project-a",
    name: "Project A dataset",
    revision: 1,
    fields: [],
    rows: [],
    sourceType: "postgres_schema",
    sourceConfigJson: { schemaName: "scopus", tableName: "sc_articles", estimatedRowCount: 6004 },
    fieldCount: 6,
  },
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
  listExternalTables: vi.fn(async () => ({ items: [{ name: "sc_articles", objectType: "table", rowCountEstimate: 10, readOnly: true, capabilities: { canRead: true, canInsert: false, canUpdate: false, canDelete: false, canExport: true } }, { name: "sc_authors", objectType: "table", rowCountEstimate: -1, readOnly: true, capabilities: { canRead: true, canInsert: false, canUpdate: false, canDelete: false, canExport: true } }] })),
  listExternalColumns: vi.fn(async () => ({ items: [{ name: "id", dataType: "uuid", primaryKey: true }] })),
  listExternalMetadata: vi.fn(async () => ({
    constraints: [{ name: "sc_articles_pkey", type: "PRIMARY KEY", columns: ["id"], definition: "PRIMARY KEY (id)" }],
    foreignKeys: [],
    indexes: [{ name: "sc_articles_pkey", unique: true, primary: true, method: "btree", definition: "CREATE UNIQUE INDEX sc_articles_pkey" }],
  })),
  previewExternalSource: vi.fn(async () => ({ rows: [{ id: "article-1" }] })),
  createExternalDataset: vi.fn(async () => ({ id: "dataset-scopus" })),
  renameDataset: vi.fn(async () => ({ id: "dataset-a", name: "Renamed catalog", revision: 2 })),
}));

vi.mock("@shared/components/ui/EnterpriseDataTable", () => ({ default: () => null }));

describe("DatasetsPage project ownership", () => {
  it("shows datasets returned by the active project API only", async () => {
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);

    expect(await screen.findByRole("button", { name: "sc_articles" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "สร้างกราฟ" })).toBeEnabled());
    expect(screen.queryByText("แคตตาล็อก")).not.toBeInTheDocument();
    expect(screen.queryByText("Project A dataset")).not.toBeInTheDocument();
    expect(screen.queryByText("Project B dataset")).not.toBeInTheDocument();
  });

  it("keeps the live external source controls available beside API-backed datasets", async () => {
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);

    expect(await screen.findByLabelText("Table context")).toHaveTextContent("PostgreSQL");
    expect(screen.getByText("อ่านอย่างเดียว")).toBeInTheDocument();
    expect(await screen.findByRole("tree", { name: "Object Explorer" })).toBeInTheDocument();
    expect(screen.getByText("อ่านอย่างเดียว")).toBeInTheDocument();
    expect(await screen.findByText(/ไม่ทราบจำนวนแถว/)).toBeInTheDocument();
    expect(screen.queryByText(/-1 rows/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "สร้างกราฟ" })).toBeEnabled());
  });

  it("submits a live dataset only once when the create button is double-clicked", async () => {
    const api = await import("@modules/datasets/api/datasetApi");
    api.createExternalDataset.mockClear();
    let finishCreate;
    api.createExternalDataset.mockImplementationOnce(() => new Promise((resolve) => { finishCreate = resolve; }));
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);
    const button = await screen.findByRole("button", { name: "สร้างกราฟ" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.createExternalDataset).toHaveBeenCalledTimes(1);
    finishCreate({ id: "dataset-scopus" });
    await waitFor(() => expect(api.createExternalDataset).toHaveBeenCalledTimes(1));
  });

  it("lists every table in each allowed schema and selects one for live preview", async () => {
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);
    expect(await screen.findByRole("tree", { name: "Object Explorer" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "sc_articles" })).toBeInTheDocument();
    const authors = await screen.findByRole("button", { name: "sc_authors" });
    fireEvent.click(authors);
    await waitFor(() => expect(screen.getByLabelText("Table context")).toHaveTextContent("scopus/sc_authors"));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "คอลัมน์สำหรับค้นหา" })).toHaveValue("id"));
    expect(screen.queryByText("External column is not allowed.")).not.toBeInTheDocument();
  });

  it("shows API-backed structure tabs without duplicating the data preview", async () => {
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("tab", { name: "Indexes" }));
    expect(await screen.findByText("sc_articles_pkey")).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(1);
  });

  it("keeps table metadata out of the object tree while retaining the columns folder", async () => {
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);
    await screen.findByRole("button", { name: "sc_articles" });
    const tree = await screen.findByRole("tree", { name: "Object Explorer" });

    expect(await within(tree).findByText("Columns")).toBeInTheDocument();
    expect(within(tree).queryByText("Constraints")).not.toBeInTheDocument();
    expect(within(tree).queryByText("Foreign Keys")).not.toBeInTheDocument();
    expect(within(tree).queryByText("Indexes")).not.toBeInTheDocument();
  });
});
