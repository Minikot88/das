import type { PropsWithChildren } from "react";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProjectStorageLegacyFixture, createZustandLegacyFixture } from "@domain/workspace/__fixtures__/workspaceFixtures";

function Wrapper({ children }: PropsWithChildren) {
  return <MemoryRouter initialEntries={["/dashboard-v2"]}>{children}</MemoryRouter>;
}

function wrapperFor(entry: string) {
  return function RouteWrapper({ children }: PropsWithChildren) {
    return <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;
  };
}

describe("useDashboardDesignerState canonical datasets", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
    window.localStorage.setItem("mini-bi-v8-workspace", JSON.stringify(createZustandLegacyFixture()));
    window.localStorage.setItem("mini-bi-projects", JSON.stringify(createProjectStorageLegacyFixture()));
    window.localStorage.setItem("mini-bi-active-project-id", "project-1");
    window.localStorage.setItem("mini-bi-active-dashboard-id", "dashboard-1");
  });

  it("adds datasets created after the designer hook mounts", async () => {
    const [{ useDashboardDesignerState }, { workspaceRepository }] = await Promise.all([
      import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState"),
      import("@infrastructure/persistence/workspace-repository/workspaceRepository"),
    ]);
    const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: Wrapper });

    act(() => {
      workspaceRepository.upsertDataset("project-1", {
        id: "dataset-live",
        name: "Live imported dataset",
        fields: [{ id: "amount", name: "amount", label: "Amount", type: "number" }],
        rows: [{ id: "row-live", amount: 42 }],
      });
    });

    expect(result.current.state.datasources.some((datasource) => datasource.id === "dataset-live")).toBe(true);
  });

  it("selects imported rows and fields without substituting demo data", async () => {
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: Wrapper });

    act(() => {
      result.current.actions.setActiveDatasourceId("dataset-shared");
    });

    expect(result.current.state.config).toMatchObject({
      sourceType: "dataset",
      datasetId: "dataset-shared",
    });
    expect(result.current.state.rows).toEqual([{ id: "row-1", region: "North" }]);
    expect(result.current.state.fields.map((field) => field.id)).toEqual(["region"]);
  });

  it("replays a saved imported-dataset chart with the same rows after remount", async () => {
    const savedCharts = await import("@modules/charts/persistence/savedChartsStorage");
    savedCharts.upsertSavedChart({
      id: "chart-imported-replay",
      title: "Imported replay",
      chartType: "bar",
      datasetId: "dataset-shared",
      config: {
        sourceType: "dataset",
        datasetId: "dataset-shared",
        chartType: "bar",
        mappings: [{ id: "x", fields: [{ id: "region" }] }],
      },
    });
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), {
      wrapper: wrapperFor("/dashboard-v2?chartId=chart-imported-replay"),
    });

    expect(result.current.state.config).toMatchObject({
      sourceType: "dataset",
      datasetId: "dataset-shared",
    });
    expect(result.current.state.rows).toEqual([{ id: "row-1", region: "North" }]);
    expect(result.current.state.fields.map((field) => field.id)).toEqual(["region"]);
  });

  it("replays the persisted SQL data contract instead of rerunning against demo rows", async () => {
    const savedCharts = await import("@modules/charts/persistence/savedChartsStorage");
    savedCharts.upsertSavedChart({
      id: "chart-sql-replay",
      title: "Persisted SQL replay",
      chartType: "bar",
      config: {
        sourceType: "demo-sql",
        datasetId: "sql_result",
        chartType: "bar",
        sqlQuery: "select total from a_future_backend_table",
        mappings: [{ id: "y", fields: [{ id: "total" }] }],
      },
      dataContract: {
        sourceType: "sql-result",
        datasetId: null,
        fields: [{ id: "total", name: "total", label: "Total", type: "number" }],
        rows: [{ total: 123 }],
        queryText: "select total from a_future_backend_table",
      },
    });
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), {
      wrapper: wrapperFor("/dashboard-v2?chartId=chart-sql-replay"),
    });

    expect(result.current.state.config.sourceType).toBe("demo-sql");
    expect(result.current.state.rows).toEqual([{ total: 123 }]);
    expect(result.current.state.fields).toEqual([
      expect.objectContaining({ id: "total", type: "number" }),
    ]);
    expect(result.current.state.sqlResult?.rows).toEqual([{ total: 123 }]);
  });

  it("never copies the authenticated designer URL as a share or embed target", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    window.history.replaceState({}, "", "/dashboard-v2?chartId=private-chart");
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.actions.copyShareLink();
      await result.current.actions.copyShareEmbed();
    });

    expect(writeText).not.toHaveBeenCalled();
    expect(result.current.state.snackbar).toMatch(/Local snapshot/i);
  });

  it("does not autosave credential-bearing SQL text into chart config storage", async () => {
    vi.useFakeTimers();
    try {
      const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
      const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: Wrapper });

      act(() => {
        result.current.actions.setSqlQuery(
          "SELECT * FROM remote_source WHERE password = 'SYNTHETIC_SQL_PASSWORD_SENTINEL'",
        );
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(801);
      });

      expect(window.localStorage.getItem("dashboard-v2-chart-config")).not.toContain(
        "SYNTHETIC_SQL_PASSWORD_SENTINEL",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("blocks saved-query and copied-config persistence for credential-bearing SQL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result } = renderHook(() => useDashboardDesignerState(), { wrapper: Wrapper });

    act(() => {
      result.current.actions.setSqlQuery(
        "SELECT * FROM remote_source WHERE api_key = 'SYNTHETIC_SQL_API_KEY_SENTINEL'",
      );
    });
    await act(async () => {
      result.current.actions.saveCurrentSqlQuery("Unsafe query");
      await result.current.actions.copyConfig();
    });

    expect(window.localStorage.getItem("dashboard-v2-sql-saved-queries")).not.toContain(
      "SYNTHETIC_SQL_API_KEY_SENTINEL",
    );
    expect(writeText.mock.calls.flat().join(" ")).not.toContain("SYNTHETIC_SQL_API_KEY_SENTINEL");
    expect(result.current.state.snackbar).toMatch(/credential/i);
  });

  it("persists the latest draft when the designer unmounts before the debounce elapses", async () => {
    vi.useFakeTimers();
    const { useDashboardDesignerState } = await import("@modules/dashboards/designer-v2/hooks/useDashboardDesignerState");
    const { result, unmount } = renderHook(() => useDashboardDesignerState(), { wrapper: Wrapper });

    act(() => {
      result.current.actions.updateSettings("general", { title: "Pending navigation draft" });
    });
    unmount();

    const persisted = JSON.parse(window.localStorage.getItem("dashboard-v2-chart-config") || "null");
    expect(persisted?.settings?.general?.title).toBe("Pending navigation draft");
    vi.useRealTimers();
  });
});
