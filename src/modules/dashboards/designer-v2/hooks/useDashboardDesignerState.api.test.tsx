import type { PropsWithChildren } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const listDatasets = vi.fn().mockResolvedValue({
  items: [{
    id: "dataset-scopus-articles",
    name: "Scopus articles",
    sourceType: "postgres_schema",
    sourceConfigJson: { schemaName: "scopus", tableName: "sc_articles" },
    rowCount: 0,
    fieldCount: 2,
    updatedAt: "2026-07-29T00:00:00.000Z",
  }],
});
const loadDataset = vi.fn().mockResolvedValue({
  id: "dataset-scopus-articles",
  name: "Scopus articles",
  fields: [
    { id: "field-year", fieldKey: "publication_year", name: "publication_year", dataType: "integer" },
    { id: "field-title", fieldKey: "title", name: "title", dataType: "text" },
  ],
  rows: [{ publication_year: 2025, title: "Real source row" }],
});
const listExternalSources = vi.fn().mockResolvedValue({ items: [{ schemaName: "scopus", displayName: "scopus" }] });
const listExternalTables = vi.fn().mockResolvedValue({ items: [{ name: "sc_articles", rowCountEstimate: 6004 }, { name: "sc_authors", rowCountEstimate: 16299 }] });

vi.mock("@infrastructure/http/client", () => ({ isMockMode: () => false }));
vi.mock("@modules/datasets/public/api", () => ({ listDatasets, loadDataset, listExternalSources, listExternalTables }));
vi.mock("@modules/charts/public/api", () => ({ getChartById: vi.fn(), createChart: vi.fn(), updateChart: vi.fn() }));

function Wrapper({ children }: PropsWithChildren) {
  return <MemoryRouter initialEntries={["/dashboard-v2?projectId=project-scopus"]}>{children}</MemoryRouter>;
}

describe("useDashboardDesignerState API source", () => {
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
});
