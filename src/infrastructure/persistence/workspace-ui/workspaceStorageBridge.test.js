import { beforeEach, describe, expect, it, vi } from "vitest";
import { CANONICAL_WORKSPACE_KEY } from "@domain/workspace/workspaceSchema";
import { createProjectStorageLegacyFixture, createZustandLegacyFixture } from "@domain/workspace/__fixtures__/workspaceFixtures";

function seedLegacyStorage() {
  const zustand = createZustandLegacyFixture();
  zustand.user = {
    id: "demo-user",
    email: "demo@example.test",
    name: "Demo User",
    role: "owner",
  };
  zustand.isAuthenticated = true;
  window.localStorage.setItem("mini-bi-v8-workspace", JSON.stringify(zustand));
  window.localStorage.setItem("mini-bi-projects", JSON.stringify(createProjectStorageLegacyFixture()));
  window.localStorage.setItem("mini-bi-active-project-id", "project-1");
  window.localStorage.setItem("mini-bi-active-dashboard-id", "dashboard-1");
}

describe("workspace storage bridge", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
    seedLegacyStorage();
  });

  it("loads canonical domain data with safe legacy UI/auth state", async () => {
    const original = window.localStorage.getItem("mini-bi-v8-workspace");
    const storage = await import("@infrastructure/persistence/workspace-ui/storage");

    const loaded = storage.loadWorkspaceState();

    expect(loaded.activeProjectId).toBe("project-1");
    expect(loaded.projects[0].name).toBe("Current workspace");
    expect(loaded.user).toMatchObject({ id: "demo-user", email: "demo@example.test" });
    expect(loaded.isAuthenticated).toBe(true);
    expect(window.localStorage.getItem(CANONICAL_WORKSPACE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem("mini-bi-v8-workspace")).toBe(original);
  });

  it("writes domain changes to canonical storage and safe UI state to a separate key", async () => {
    const original = window.localStorage.getItem("mini-bi-v8-workspace");
    const storage = await import("@infrastructure/persistence/workspace-ui/storage");
    const loaded = storage.loadWorkspaceState();
    loaded.projects[0].name = "Renamed through Zustand";
    loaded.user = {
      ...loaded.user,
      token: "SYNTHETIC_TOKEN_SENTINEL",
      password: "SYNTHETIC_PASSWORD_SENTINEL",
    };

    storage.saveWorkspaceState(loaded);

    const canonical = window.localStorage.getItem(CANONICAL_WORKSPACE_KEY);
    const uiState = window.localStorage.getItem("mini-bi-ui-v1");
    expect(canonical).toContain("Renamed through Zustand");
    expect(canonical).not.toContain("SYNTHETIC_TOKEN_SENTINEL");
    expect(uiState).toContain("demo-user");
    expect(uiState).not.toContain("SYNTHETIC_TOKEN_SENTINEL");
    expect(uiState).not.toContain("SYNTHETIC_PASSWORD_SENTINEL");
    expect(window.localStorage.getItem("mini-bi-v8-workspace")).toBe(original);
  });

  it("reloads the combined canonical and UI projection", async () => {
    let storage = await import("@infrastructure/persistence/workspace-ui/storage");
    const loaded = storage.loadWorkspaceState();
    loaded.projects[0].name = "Persisted canonical name";
    loaded.sidebarCollapsed = true;
    storage.saveWorkspaceState(loaded);
    vi.resetModules();

    storage = await import("@infrastructure/persistence/workspace-ui/storage");
    const reloaded = storage.loadWorkspaceState();

    expect(reloaded.projects[0].name).toBe("Persisted canonical name");
    expect(reloaded.sidebarCollapsed).toBe(true);
    expect(reloaded.isAuthenticated).toBe(true);
  });

  it("redacts credential material when canonical persistence falls back to the legacy key", async () => {
    window.localStorage.setItem(CANONICAL_WORKSPACE_KEY, "{invalid-canonical");
    vi.resetModules();
    const storage = await import("@infrastructure/persistence/workspace-ui/storage");

    storage.saveWorkspaceState({
      projects: [],
      charts: [{ id: "chart-1", config: { authorization: "Bearer SYNTHETIC_TOKEN_SENTINEL" } }],
      importedDatasets: [],
      shareLinks: { "share-1": { snapshot: { password: "SYNTHETIC_PASSWORD_SENTINEL" } } },
      user: { id: "demo-user", accessToken: "SYNTHETIC_TOKEN_SENTINEL" },
      appSettings: { privateKey: "SYNTHETIC_PRIVATE_KEY_SENTINEL" },
      ui: {},
    });

    const legacy = window.localStorage.getItem("mini-bi-v8-workspace");
    expect(legacy).not.toContain("SYNTHETIC_TOKEN_SENTINEL");
    expect(legacy).not.toContain("SYNTHETIC_PASSWORD_SENTINEL");
    expect(legacy).not.toContain("SYNTHETIC_PRIVATE_KEY_SENTINEL");
  });

  it("redacts credential material from builder drafts", async () => {
    const storage = await import("@infrastructure/persistence/workspace-ui/storage");

    storage.saveBuilderDraft({
      title: "Safe draft",
      password: "SYNTHETIC_PASSWORD_SENTINEL",
      sourceUrl: "https://example.test/data?access_token=SYNTHETIC_TOKEN_SENTINEL",
      signedUrl: "https://example.test/data?range=A1&X-Amz-Signature=SYNTHETIC_AWS_SENTINEL#oauth_token=SYNTHETIC_OAUTH_SENTINEL",
      ui: { rows: [{ token: "SYNTHETIC_NESTED_TOKEN_SENTINEL" }] },
    });

    const draft = window.localStorage.getItem("mini-bi-v8-builder-draft");
    expect(draft).toContain("Safe draft");
    expect(draft).not.toContain("SYNTHETIC_PASSWORD_SENTINEL");
    expect(draft).not.toContain("SYNTHETIC_TOKEN_SENTINEL");
    expect(draft).not.toContain("SYNTHETIC_NESTED_TOKEN_SENTINEL");
    expect(draft).not.toContain("SYNTHETIC_AWS_SENTINEL");
    expect(draft).not.toContain("SYNTHETIC_OAUTH_SENTINEL");
    expect(draft).toContain("range=A1");
  });

  it("preserves credential-named dataset columns while redacting app-owned credentials", async () => {
    const storage = await import("@infrastructure/persistence/workspace-ui/storage");

    const snapshot = storage.createWorkspaceSnapshot({
      projects: [],
      importedDatasets: [{
        id: "dataset-1",
        rows: [{
          token: "customer-segment",
          sourceUrl: "https://example.test/report?access_token=dimension-value",
        }],
      }],
      charts: [{
        id: "chart-1",
        config: { token: "SYNTHETIC_APP_TOKEN_SENTINEL" },
        dataContract: { rows: [{ token: "chart-segment" }] },
      }],
      user: { id: "demo-user" },
      ui: {},
    });

    expect(snapshot.importedDatasets[0].rows[0]).toEqual({
      token: "customer-segment",
      sourceUrl: "https://example.test/report",
    });
    expect(snapshot.charts[0].dataContract.rows[0]).toEqual({ token: "chart-segment" });
    expect(snapshot.charts[0].config).not.toHaveProperty("token");
  });
});
