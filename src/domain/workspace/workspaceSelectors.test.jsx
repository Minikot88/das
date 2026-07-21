import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createLocalWorkspaceRepository } from "@domain/workspace/workspaceRepository";
import {
  selectActiveDashboard,
  selectActiveProject,
  selectLegacySheetAlias,
  selectProjectCharts,
  selectProjectDashboards,
  selectProjectDatasets,
  selectProjects,
  selectShareById,
  useWorkspaceSelector,
} from "@domain/workspace/workspaceSelectors";
import { createProjectStorageLegacyFixture, createZustandLegacyFixture, fixedClock } from "@domain/workspace/__fixtures__/workspaceFixtures";

function createRepository() {
  const values = new Map([
    ["mini-bi-v8-workspace", JSON.stringify(createZustandLegacyFixture())],
    ["mini-bi-projects", JSON.stringify(createProjectStorageLegacyFixture())],
    ["mini-bi-active-project-id", "project-1"],
    ["mini-bi-active-dashboard-id", "dashboard-1"],
  ]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
  repository.migrateIfNeeded();
  return repository;
}

describe("workspace selectors", () => {
  it("selects the same active project and dashboard from one snapshot", () => {
    const snapshot = createRepository().getSnapshot();

    expect(selectProjects(snapshot)).toHaveLength(1);
    expect(selectActiveProject(snapshot)?.id).toBe("project-1");
    expect(selectActiveDashboard(snapshot)?.id).toBe("dashboard-1");
  });

  it("selects project-owned datasets, charts, dashboards, shares, and Sheet aliases", () => {
    const snapshot = createRepository().getSnapshot();

    expect(selectProjectDatasets(snapshot, "project-1")).toHaveLength(2);
    expect(selectProjectCharts(snapshot, "project-1")).toHaveLength(2);
    expect(selectProjectDashboards(snapshot, "project-1")).toHaveLength(1);
    expect(selectShareById(snapshot, "share-1")).toMatchObject({ projectId: "project-1", dashboardId: "dashboard-1" });
    expect(selectLegacySheetAlias(snapshot, "sheet-1")).toEqual({
      projectId: "project-1",
      sheetId: "sheet-1",
      name: "Sales sheet",
      dashboardIds: ["dashboard-1"],
    });
  });

  it("reacts to same-tab repository updates through useSyncExternalStore", () => {
    const repository = createRepository();
    const { result } = renderHook(() =>
      useWorkspaceSelector((snapshot) => selectActiveProject(snapshot)?.name, repository)
    );

    act(() => {
      repository.update((snapshot) => ({
        ...snapshot,
        projects: snapshot.projects.map((project) => ({ ...project, name: "Reactive workspace" })),
      }));
    });

    expect(result.current).toBe("Reactive workspace");
  });
});
