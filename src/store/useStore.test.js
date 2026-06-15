import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "./useStore";

function activeContext() {
  const state = useStore.getState();
  return {
    projectId: state.activeProjectId,
    sheetId: state.activeSheetId,
    dashboardId: state.activeDashboardId,
  };
}

describe("workspace store critical flows", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useStore.getState().resetDashboardFilters();
    useStore.getState().clearDashboardInteractions();
  });

  it("creates a dashboard, saves a chart, and loads a saved view", () => {
    const store = useStore.getState();
    store.createProject("Hardening Workspace");
    useStore.getState().createDashboard("Executive Readiness");

    const context = activeContext();
    const result = useStore.getState().saveChartToDashboardContext({
      ...context,
      chart: {
        title: "Revenue",
        type: "bar",
        rows: [{ category: "A", sales: 10 }],
        mapping: { x: "category", y: "sales" },
      },
    });

    expect(result.chart.title).toBe("Revenue");
    expect(result.layoutItem.i).toBeTruthy();

    useStore.getState().setCrossFilter({ field: "category", value: "A" });
    useStore.getState().pushDrilldownStep({ field: "category", value: "A" });
    useStore.getState().createSavedView({
      name: "Filtered Revenue",
      dashboardId: context.dashboardId,
      filters: useStore.getState().dashboardFilters,
      interactions: useStore.getState().dashboardInteractions,
      layout: [result.layoutItem],
    });

    const viewId = useStore.getState().savedViews[0].id;
    useStore.getState().clearDashboardInteractions();
    useStore.getState().loadSavedView(viewId);
    expect(useStore.getState().dashboardInteractions.crossFilter.value).toBe("A");
  });
});
