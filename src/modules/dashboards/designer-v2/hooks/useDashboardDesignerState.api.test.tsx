import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const datasetListResponse = {
  items: [{
    id: "dataset-scopus-articles",
    name: "Scopus articles",
    sourceType: "postgres_schema",
    sourceConfigJson: { schemaName: "scopus", tableName: "sc_articles" },
    rowCount: 0,
    fieldCount: 2,
    updatedAt: "2026-07-29T00:00:00.000Z",
  }],
};
const listDatasets = vi.fn(async ({ projectId }: { projectId?: string }) => {
  if (projectId !== "project-scopus") throw new Error("Project was not found.");
  return datasetListResponse;
});
const getProjects = vi.fn(async () => [
  { id: "project-archive", name: "Archive" },
  { id: "project-scopus", name: "Scopus" },
]);
const loadDataset = vi.fn(async (datasetId: string) => datasetId === "dataset-scopus-authors" ? {
  id: "dataset-scopus-authors",
  name: "scopus.sc_authors",
  sourceConfigJson: { schemaName: "scopus", tableName: "sc_authors" },
  fields: [
    { id: "field-year", fieldKey: "publication_year", name: "publication_year", dataType: "integer" },
    { id: "field-author", fieldKey: "author_name", name: "author_name", dataType: "text" },
  ],
  rows: [{ publication_year: 2025, author_name: "Ada" }],
} : {
  id: "dataset-scopus-articles",
  name: "Scopus articles",
  sourceConfigJson: { schemaName: "scopus", tableName: "sc_articles" },
  fields: [
    { id: "field-year", fieldKey: "publication_year", name: "publication_year", dataType: "integer" },
    { id: "field-title", fieldKey: "title", name: "title", dataType: "text" },
  ],
  rows: [{ publication_year: 2025, title: "Real source row" }],
});
const listExternalSources = vi.fn().mockResolvedValue({ items: [{ schemaName: "scopus", displayName: "scopus" }] });
const listExternalTables = vi.fn().mockResolvedValue({ items: [{ name: "sc_articles", rowCountEstimate: 6004 }, { name: "sc_authors", rowCountEstimate: 16299 }] });
const createExternalDataset = vi.fn().mockResolvedValue({
  id: "dataset-scopus-authors",
  name: "scopus.sc_authors",
  sourceType: "postgres_schema",
  sourceConfigJson: { schemaName: "scopus", tableName: "sc_authors" },
  fieldCount: 1,
});

vi.mock("@infrastructure/http/client", () => ({ isMockMode: () => false }));
vi.mock("@modules/datasets/public/api", () => ({ createExternalDataset, listDatasets, loadDataset, listExternalSources, listExternalTables }));
vi.mock("@modules/charts/public/api", () => ({ getChartById: vi.fn(), createChart: vi.fn(), updateChart: vi.fn() }));
vi.mock("@modules/projects", () => ({
  API_ACTIVE_PROJECT_KEY: "mini-bi-api-active-project-id",
  getProjects,
  resolveApiActiveProject: (projects: Array<{ id: string }>, preferredProjectId?: string | null) =>
    projects.find((project) => project.id === preferredProjectId) ?? projects[0] ?? null,
}));

function Wrapper({ children }: PropsWithChildren) {
  return <MemoryRouter initialEntries={["/dashboard-v2?projectId=project-scopus"]}>{children}</MemoryRouter>;
}

function WrapperWithoutProject({ children }: PropsWithChildren) {
  return <MemoryRouter initialEntries={["/dashboard-v2"]}>{children}</MemoryRouter>;
}

describe("useDashboardDesignerState API source", () => {
  it("resolves the stored API project before loading a direct dashboard-v2 route", async () => {
    window.localStorage.setItem("mini-bi-api-active-project-id", "project-scopus");
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: WrapperWithoutProject });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    expect(result.current.state.datasources).toEqual(expect.arrayContaining([
      expect.objectContaining({ schema: "scopus", table: "sc_articles" }),
    ]));
    expect(result.current.state.snackbar).not.toBe("Project was not found.");
  });

  it("renders Scopus dataset metadata from the API without writing legacy project context", async () => {
    window.localStorage.clear();
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    expect(listDatasets).toHaveBeenCalledWith({ projectId: "project-scopus", page: 1, pageSize: 200 });
    expect(result.current.state.datasources).toEqual(expect.arrayContaining([
      expect.objectContaining({ schema: "scopus", table: "sc_articles" }),
    ]));
    expect(result.current.state.rows).toEqual([{ publication_year: 2025, title: "Real source row" }]);
    await waitFor(() => expect(result.current.state.externalSchemaCatalog).toEqual([
      expect.objectContaining({ schemaName: "scopus", tables: expect.arrayContaining([expect.objectContaining({ name: "sc_articles" }), expect.objectContaining({ name: "sc_authors" })]) }),
    ]));
    expect(window.localStorage.getItem("mini-bi-active-project-id")).toBeNull();
  });

  it("activates an unsaved catalog table through the real external dataset API and resets mappings to that table", async () => {
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    act(() => {
      result.current.actions.dropField("xAxis", result.current.state.fields[0]);
    });
    await act(async () => {
      await result.current.actions.setSelectedTable("scopus", "sc_authors");
    });

    expect(createExternalDataset).toHaveBeenCalledWith({
      projectId: "project-scopus",
      name: "scopus.sc_authors",
      schemaName: "scopus",
      tableName: "sc_authors",
    });
    expect(result.current.state.selectedTable).toBe("sc_authors");
    expect(result.current.state.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "publication_year", table: "scopus.sc_authors" }),
      expect.objectContaining({ name: "author_name", table: "scopus.sc_authors" }),
    ]));
    expect(result.current.state.config.mappings.find((slot) => slot.id === "xAxis")?.fields).toEqual([
      expect.objectContaining({ id: "field-year", table: "scopus.sc_authors" }),
    ]);
    expect(result.current.state.config.datasetId).toBe("dataset-scopus-authors");
  });
});
