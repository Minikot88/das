import { describe, expect, it, vi } from "vitest";
import {
  createBeforeUnloadHandler,
  createDashboardAutosave,
  createSessionImageAsset,
  dashboardSelectValue,
  isDashboardPersistenceReady,
  normalizeDashboardLayout,
  prepareDashboardForPersistence,
  revokeRemovedSessionAssets,
  runExplicitDashboardSave,
  shouldWarnAboutUnsavedChanges,
} from "@domain/dashboard/dashboardPersistence";

describe("dashboard persistence", () => {
  it.each([
    [null, ""],
    [undefined, ""],
    ["null", ""],
    ["undefined", ""],
    ["dashboard-1", "dashboard-1"],
  ])("normalizes unresolved dashboard select value %s", (dashboardId, expected) => {
    expect(dashboardSelectValue(dashboardId)).toBe(expected);
  });

  it.each([
    [{ projectId: null, dashboardId: null }],
    [{ projectId: "project-1", dashboardId: null }],
    [{ projectId: "project-1", dashboardId: "null" }],
    [{ projectId: "project-1", dashboardId: "undefined" }],
  ])("does not persist unresolved API dashboard identity %#", (dashboard) => {
    expect(isDashboardPersistenceReady(dashboard)).toBe(false);
  });

  it("persists only after both API ownership identifiers resolve", () => {
    expect(isDashboardPersistenceReady({
      projectId: "project-1",
      dashboardId: "dashboard-1",
    })).toBe(true);
  });

  it("normalizes layout deterministically and enforces dashboard ownership", () => {
    const input = {
      id: "dashboard-1",
      projectId: "project-1",
      widgets: [
        { id: "b", x: 99.7, y: -4, w: 0, h: 2.8, zIndex: 3 },
        { id: "a", x: 2.2, y: 5.1, w: 4.9, h: 3.2, zIndex: 1 },
      ],
    };

    const first = normalizeDashboardLayout(input, { columns: 12 });
    const second = normalizeDashboardLayout(input, { columns: 12 });

    expect(first).toEqual(second);
    expect(first.widgets).toEqual([
      expect.objectContaining({ id: "b", projectId: "project-1", dashboardId: "dashboard-1", x: 11, y: 0, w: 1, h: 3 }),
      expect.objectContaining({ id: "a", projectId: "project-1", dashboardId: "dashboard-1", x: 2, y: 5, w: 5, h: 3 }),
    ]);
    expect(input.widgets[0]).not.toHaveProperty("dashboardId");
  });

  it("debounces repeated edits and flushes the latest payload", async () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const autosave = createDashboardAutosave({ save, delay: 500 });

    autosave.schedule({ revision: 1 });
    vi.advanceTimersByTime(300);
    autosave.schedule({ revision: 2 });
    vi.advanceTimersByTime(499);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith({ revision: 2 });
    expect(autosave.getState().status).toBe("saved");
    vi.useRealTimers();
  });

  it("supports explicit flush, cancellation, failure status, and retry", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockRejectedValueOnce(new Error("quota")).mockResolvedValueOnce(undefined);
    const autosave = createDashboardAutosave({ save, delay: 500 });

    autosave.schedule({ revision: 1 });
    await expect(autosave.flush()).rejects.toThrow("quota");
    expect(autosave.getState()).toMatchObject({ status: "error", error: "quota" });

    await autosave.retry();
    expect(save).toHaveBeenCalledTimes(2);
    expect(autosave.getState().status).toBe("saved");

    autosave.schedule({ revision: 2 });
    autosave.cancel();
    await vi.runAllTimersAsync();
    expect(save).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("flushes the latest pending edit when the autosave owner is disposed", async () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const autosave = createDashboardAutosave({ save, delay: 500 });

    autosave.schedule({ revision: 1 });
    autosave.schedule({ revision: 2 });
    await autosave.dispose();
    await vi.runAllTimersAsync();

    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith({ revision: 2 });
    expect(autosave.getState().status).toBe("saved");
    vi.useRealTimers();
  });

  it("reports explicit-save success only after durable persistence resolves", async () => {
    let resolveSave;
    const save = vi.fn(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));
    const autosave = createDashboardAutosave({ save });
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const pending = runExplicitDashboardSave({
      autosave,
      payload: { revision: 3 },
      onSuccess,
      onError,
    });
    expect(onSuccess).not.toHaveBeenCalled();

    resolveSave();
    await pending;
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it("warns on pending, saving, or failed edits", () => {
    expect(shouldWarnAboutUnsavedChanges("pending")).toBe(true);
    expect(shouldWarnAboutUnsavedChanges("saving")).toBe(true);
    expect(shouldWarnAboutUnsavedChanges("error")).toBe(true);
    expect(shouldWarnAboutUnsavedChanges("saved")).toBe(false);

    const handler = createBeforeUnloadHandler(() => true);
    const event = { preventDefault: vi.fn(), returnValue: undefined };
    expect(handler(event)).toBe("");
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.returnValue).toBe("");
  });

  it("marks image object URLs as session-only and removes them from durable payloads", () => {
    const urlApi = { createObjectURL: vi.fn(() => "blob:session-image"), revokeObjectURL: vi.fn() };
    const asset = createSessionImageAsset({ name: "logo.png", type: "image/png", size: 120 }, urlApi);
    const dashboard = {
      id: "dashboard-1",
      projectId: "project-1",
      widgets: [{ id: "image-1", type: "image", config: { src: asset.src, fileName: "logo.png", asset: asset.metadata } }],
    };

    const durable = prepareDashboardForPersistence(dashboard);

    expect(asset.metadata).toMatchObject({ durability: "session-only", persisted: false });
    expect(durable.widgets[0].config.src).toBeNull();
    expect(durable.widgets[0].config.asset).toMatchObject({ available: false, durability: "session-only" });

    revokeRemovedSessionAssets(dashboard.widgets, [], urlApi);
    expect(urlApi.revokeObjectURL).toHaveBeenCalledWith("blob:session-image");
  });
});
