import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
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
    { id: "field-year", fieldKey: "publication_year", name: "publication_year", dataType: "integer", semanticType: "number" },
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
const listExternalColumns = vi.fn().mockResolvedValue({ items: [
  { name: "publication_year", dataType: "integer", nullable: true, primaryKey: false, foreignKeys: [] },
  { name: "author_name", dataType: "text", nullable: true, primaryKey: false, foreignKeys: [] },
] });
const listExternalRelationships = vi.fn().mockResolvedValue({ items: [] });
const previewExternalSource = vi.fn().mockResolvedValue({ rows: [], sqlPreview: "SELECT 1", queryDurationMs: 1 });
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
vi.mock("@modules/datasets/public/api", () => ({
  createExternalDataset,
  listDatasets,
  loadDataset,
  listExternalColumns,
  listExternalRelationships,
  listExternalSources,
  listExternalTables,
  previewExternalSource,
}));
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
  it("excludes calculated result fields from physical selected fields on later joins", async () => {
    const { physicalSelectedFields } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const selected = physicalSelectedFields(
      [{ schema: "scopus", table: "sc_articles", alias: "articles" }],
      [
        { sourceAlias: "articles", name: "articles_id", label: "articles.id" },
        { name: "article_ratio", label: "article_ratio", resultType: "number" },
      ] as never,
      {},
    );

    expect(selected).toEqual([
      expect.objectContaining({ tableAlias: "articles", column: "id", alias: "articles_id" }),
    ]);
  });

  it("hydrates saved multi-table joins, semantic overrides, casts, and calculated fields", async () => {
    const { persistedMultiTableState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    expect(persistedMultiTableState({
      sourceConfigJson: {
        selectedTables: [
          { schema: "scopus", table: "sc_articles", alias: "articles" },
          { schema: "scopus", table: "sc_journals", alias: "journals" },
        ],
        joins: [{ left: { alias: "articles", column: "journal_id" }, right: { alias: "journals", column: "id" }, joinType: "left" }],
        selectedFields: [{ tableAlias: "articles", column: "year_text", cast: { targetType: "numeric" } }],
        semanticTypeOverrides: { "articles.year_text": "year" },
        calculatedFields: [{ name: "citation_ratio", resultType: "number" }],
      },
    })).toMatchObject({
      tables: [{ alias: "articles" }, { alias: "journals" }],
      joins: [expect.objectContaining({ joinType: "left" })],
      safeCasts: { "articles.year_text": "numeric" },
      semanticTypeOverrides: { "articles.year_text": "year" },
      calculatedFields: [{ name: "citation_ratio" }],
    });
  });
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
    expect(result.current.state.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "field-year", semanticType: "quantity" }),
    ]));
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

  it("adds a second catalog table and waits for a validated manual join when no FK exists", async () => {
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    act(() => {
      result.current.actions.dropField("xAxis", result.current.state.fields[0]);
    });
    await act(async () => {
      await result.current.actions.setSelectedTable("scopus", "sc_authors");
    });

    expect(result.current.state.selectedTables).toEqual([
      expect.objectContaining({ table: "sc_articles", alias: "articles" }),
      expect.objectContaining({ table: "sc_authors", alias: "authors" }),
    ]);
    expect(result.current.state.datasetJoins).toEqual([]);
    expect(result.current.state.selectedTable).toBe("sc_authors");
    expect(result.current.state.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "authors.publication_year", physicalType: "integer" }),
      expect.objectContaining({ name: "authors.author_name", physicalType: "text" }),
    ]));
    expect(result.current.state.config.datasetId).toBe("dataset-scopus-articles");
    expect(result.current.state.snackbar).toContain("Manual Join");
  });

  it("adds a junction table from a unique FK path before materializing the target table", async () => {
    listExternalRelationships.mockImplementation(async (_schema, table, _projectId, targetTable) => {
      if (table === "sc_articles" && targetTable === "sc_keywords") {
        return {
          items: [],
          paths: [[
            { name: "article_keywords_article", columnName: "id", referencedSchema: "scopus", referencedTable: "sc_article_keywords", referencedColumn: "article_id", direction: "incoming" },
            { name: "article_keywords_keyword", columnName: "keyword_id", referencedSchema: "scopus", referencedTable: "sc_keywords", referencedColumn: "id", direction: "outgoing" },
          ]],
        };
      }
      return { items: [], paths: [] };
    });
    listExternalColumns.mockImplementation(async (_schema, table) => ({
      items: table === "sc_article_keywords"
        ? [
            { name: "article_id", dataType: "bigint", nullable: false, primaryKey: false, foreignKeys: [] },
            { name: "keyword_id", dataType: "bigint", nullable: false, primaryKey: false, foreignKeys: [] },
          ]
        : [
            { name: "id", dataType: "bigint", nullable: false, primaryKey: true, foreignKeys: [] },
            { name: "name", dataType: "text", nullable: false, primaryKey: false, foreignKeys: [] },
          ],
    }));
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      await result.current.actions.setSelectedTable("scopus", "sc_keywords");
    });

    expect(result.current.state.selectedTables.map((table) => table.table)).toEqual([
      "sc_articles", "sc_article_keywords", "sc_keywords",
    ]);
    expect(result.current.state.datasetJoins).toHaveLength(2);
    expect(previewExternalSource).toHaveBeenLastCalledWith(expect.objectContaining({
      selectedTables: expect.arrayContaining([expect.objectContaining({ table: "sc_article_keywords" })]),
    }), expect.anything());
  });

  it("uses the unique shortest relationship path when more than one selected table can reach the target", async () => {
    listExternalRelationships.mockImplementation(async (_schema, table, _projectId, targetTable) => {
      if (targetTable === "sc_journals" && table === "sc_articles") {
        return { items: [{ name: "article_journal", columnName: "journal_id", referencedSchema: "scopus", referencedTable: "sc_journals", referencedColumn: "id", direction: "outgoing" }], paths: [] };
      }
      if (targetTable === "sc_keywords" && table === "sc_articles") {
        return { items: [], paths: [[
          { name: "article_keywords_article", columnName: "id", referencedSchema: "scopus", referencedTable: "sc_article_keywords", referencedColumn: "article_id", direction: "incoming" },
          { name: "article_keywords_keyword", columnName: "keyword_id", referencedSchema: "scopus", referencedTable: "sc_keywords", referencedColumn: "id", direction: "outgoing" },
        ]] };
      }
      if (targetTable === "sc_keywords" && table === "sc_journals") {
        return { items: [], paths: [[
          { name: "journal_articles", columnName: "id", referencedSchema: "scopus", referencedTable: "sc_articles", referencedColumn: "journal_id", direction: "incoming" },
          { name: "article_keywords_article", columnName: "id", referencedSchema: "scopus", referencedTable: "sc_article_keywords", referencedColumn: "article_id", direction: "incoming" },
          { name: "article_keywords_keyword", columnName: "keyword_id", referencedSchema: "scopus", referencedTable: "sc_keywords", referencedColumn: "id", direction: "outgoing" },
        ]] };
      }
      return { items: [], paths: [] };
    });
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      await result.current.actions.setSelectedTable("scopus", "sc_journals");
    });
    await waitFor(() => expect(result.current.state.selectedTables).toHaveLength(2));
    await act(async () => {
      await result.current.actions.setSelectedTable("scopus", "sc_keywords");
    });

    expect(result.current.state.selectedTables.map((table) => table.table)).toEqual([
      "sc_articles", "sc_journals", "sc_article_keywords", "sc_keywords",
    ]);
    expect(result.current.state.datasetJoins).toHaveLength(3);
    expect(result.current.state.snackbar).not.toContain("Manual Join");
  });
});
