import { describe, expect, it, vi } from "vitest";
import { getStorageHealth, saveWorkspaceState, subscribeStorageHealth } from "@infrastructure/persistence/workspace-ui/storage";

describe("storage reliability", () => {
  it("notifies subscribers when workspace persistence fails", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeStorageHealth(listener);
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error("quota exceeded");
    });

    try {
      saveWorkspaceState({ projects: [], charts: [], ui: {} });
      expect(getStorageHealth().ok).toBe(false);
      expect(getStorageHealth().message).toContain("quota exceeded");
      expect(listener).toHaveBeenCalled();
    } finally {
      Storage.prototype.setItem = originalSetItem;
      unsubscribe();
    }
  });
});
