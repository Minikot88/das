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
const loadDataset = vi.fn(async (datasetId: string) => datasetId === "dataset-scopus-affiliations" ? {
  id: "dataset-scopus-affiliations",
  name: "scopus.sc_affiliations",
  sourceConfigJson: { schemaName: "scopus", tableName: "sc_affiliations" },
  fields: [
    { id: "field-city", fieldKey: "city", name: "city", dataType: "text" },
    { id: "field-id", fieldKey: "id", name: "id", dataType: "integer", primaryKey: true },
  ],
  rows: [{ city: "Bangkok", id: 1 }],
} : datasetId === "dataset-scopus-authors" ? {
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
const createChart = vi.fn().mockResolvedValue({ id: "chart-scopus", revision: 1 });
const getChartById = vi.fn(async (chartId: string) => chartId === "chart-saved" ? {
  id: "chart-saved",
  datasetId: "dataset-scopus-affiliations",
  revision: 2,
  config: { chartType: "bar" },
} : null);

vi.mock("@infrastructure/http/client", () => ({ isMockMode: () => false }));
vi.mock("@modules/datasets/public/api", () => ({ createExternalDataset, listDatasets, loadDataset, listExternalSources, listExternalTables }));
vi.mock("@modules/charts/public/api", () => ({ getChartById, createChart, updateChart: vi.fn() }));
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

function WrapperSavedChart({ children }: PropsWithChildren) {
  return <MemoryRouter initialEntries={["/dashboard-v2?projectId=project-scopus&chartId=chart-saved"]}>{children}</MemoryRouter>;
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

  it("keeps a newly saved API chart addressable for reload", async () => {
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state.config.datasetId).toBe("dataset-scopus-articles"));

    await act(async () => {
      await result.current.actions.saveChart();
    });

    expect(result.current.state.saveStatus).toBe("saved");
    expect(result.current.state.config.chartId).toBe("chart-scopus");
    expect(new URL(window.location.href).searchParams.get("chartId")).toBe("chart-scopus");
  });

  it("reloads the saved chart dataset instead of replacing it with the first project dataset", async () => {
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: WrapperSavedChart });

    await waitFor(() => expect(result.current.state.selectedTable).toBe("sc_affiliations"));

    expect(result.current.state.config.datasetId).toBe("dataset-scopus-affiliations");
    expect(result.current.state.rows).toEqual([{ city: "Bangkok", id: 1 }]);
    expect(result.current.state.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "city", table: "scopus.sc_affiliations" }),
    ]));
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
    expect(result.current.state.config.settings.general.title).toBe("scopus.sc_authors");
    expect(result.current.state.config.settings.general.subtitle).toBe("ข้อมูลจาก scopus.sc_authors");
  });
});
