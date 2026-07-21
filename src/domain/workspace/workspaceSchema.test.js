import { describe, expect, it } from "vitest";
import {
  CANONICAL_WORKSPACE_KEY,
  MIGRATION_MARKER_KEY,
  WORKSPACE_SCHEMA_VERSION,
  cloneWorkspace,
  createEmptyWorkspace,
  normalizeWorkspaceDocument,
  scanForSecretMaterial,
  validateWorkspaceDocument,
} from "@domain/workspace/workspaceSchema";
import { createValidWorkspaceFixture, fixedClock } from "@domain/workspace/__fixtures__/workspaceFixtures";

describe("workspace schema", () => {
  it("creates a deterministic empty version-one workspace", () => {
    const workspace = createEmptyWorkspace(() => "2026-07-11T00:00:00.000Z");

    expect(CANONICAL_WORKSPACE_KEY).toBe("mini-bi-workspace-v1");
    expect(MIGRATION_MARKER_KEY).toBe("mini-bi-workspace-v1-migration-complete");
    expect(WORKSPACE_SCHEMA_VERSION).toBe(1);
    expect(workspace).toEqual({
      schemaVersion: 1,
      revision: 0,
      active: { projectId: null, dashboardId: null },
      projects: [],
      settings: {
        theme: "system",
        locale: "th",
        density: "comfortable",
        dateFormat: "MMM d, yyyy",
        numberFormat: "compact",
        dashboardPreferences: {},
      },
      migration: {
        status: "not-started",
        completedAt: null,
        sourceKeys: [],
        sourceFingerprints: {},
        conflicts: [],
        warnings: [],
        unresolvedReferences: [],
      },
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-11T00:00:00.000Z",
    });
  });

  it("validates a project-owned workspace graph", () => {
    const result = validateWorkspaceDocument(createValidWorkspaceFixture());

    expect(result).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it("rejects active context that points outside the workspace", () => {
    const workspace = createValidWorkspaceFixture();
    workspace.active.projectId = "missing-project";

    const result = validateWorkspaceDocument(workspace);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("active.projectId references a missing project: missing-project");
  });

  it("rejects entity ownership mismatches", () => {
    const workspace = createValidWorkspaceFixture();
    workspace.projects[0].datasets[0].projectId = "project-2";

    const result = validateWorkspaceDocument(workspace);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("dataset dataset-1 must belong to project project-1");
  });

  it("reports unresolved chart references without deleting the widget", () => {
    const workspace = createValidWorkspaceFixture();
    workspace.projects[0].dashboards[0].widgets[0].chartId = "missing-chart";

    const result = validateWorkspaceDocument(workspace);

    expect(result.valid).toBe(true);
    expect(result.warnings).toContain("widget widget-1 references a missing chart: missing-chart");
  });

  it("detects forbidden secret properties and credential-bearing URLs", () => {
    const secretPayload = {
      password: "SYNTHETIC_PASSWORD_SENTINEL",
      safeUrl: "https://demo:secret@example.test/data",
    };

    expect(scanForSecretMaterial(secretPayload)).toEqual([
      "password",
      "safeUrl contains URL credentials",
    ]);
  });

  it("detects common credential aliases and sensitive URL query or fragment parameters", () => {
    const payload = {
      apiKey: "SYNTHETIC_API_KEY_SENTINEL",
      authorization: "Bearer SYNTHETIC_TOKEN_SENTINEL",
      nested: { private_key: "SYNTHETIC_PRIVATE_KEY_SENTINEL" },
      signedUrl: "https://example.test/data?access_token=SYNTHETIC#id_token=SYNTHETIC",
    };

    expect(scanForSecretMaterial(payload)).toEqual([
      "apiKey",
      "authorization",
      "nested.private_key",
      "signedUrl contains sensitive URL parameter: access_token",
      "signedUrl contains sensitive URL fragment parameter: id_token",
    ]);
  });

  it("treats dataset row values as opaque while scanning app-owned metadata", () => {
    const payload = {
      projects: [{
        datasets: [{
          rows: [{
            token: "customer-segment",
            sourceUrl: "https://example.test/report?access_token=dimension-value#id_token=cohort-value",
          }],
        }],
        charts: [{
          config: { accessToken: "SYNTHETIC_APP_TOKEN_SENTINEL" },
          dataContract: { rows: [{ token: "chart-segment" }] },
        }],
      }],
      ui: { rows: [{ token: "SYNTHETIC_UI_TOKEN_SENTINEL" }] },
    };

    expect(scanForSecretMaterial(payload)).toEqual([
      "projects[0].datasets[0].rows[0].sourceUrl contains sensitive URL parameter: access_token",
      "projects[0].datasets[0].rows[0].sourceUrl contains sensitive URL fragment parameter: id_token",
      "projects[0].charts[0].config.accessToken",
      "ui.rows[0].token",
    ]);
  });

  it("rejects secret material anywhere in a canonical document", () => {
    const workspace = createValidWorkspaceFixture();
    workspace.projects[0].connectionProfiles.push({
      id: "connection-1",
      projectId: "project-1",
      name: "Unsafe fixture",
      type: "postgres",
      password: "SYNTHETIC_PASSWORD_SENTINEL",
    });

    const result = validateWorkspaceDocument(workspace);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("canonical workspace contains forbidden secret material: projects[0].connectionProfiles[0].password");
  });

  it("clones workspace values without retaining mutable references", () => {
    const workspace = createValidWorkspaceFixture();
    const copy = cloneWorkspace(workspace);

    copy.projects[0].name = "Changed";

    expect(workspace.projects[0].name).toBe("Sales workspace");
  });

  it("normalizes safe defaults without mutating the input", () => {
    const input = createValidWorkspaceFixture();
    input.settings = { theme: "invalid-theme", locale: "" };
    const original = structuredClone(input);

    const normalized = normalizeWorkspaceDocument(input, { clock: fixedClock });

    expect(normalized.settings.theme).toBe("system");
    expect(normalized.settings.locale).toBe("th");
    expect(input).toEqual(original);
  });

  it("refuses to normalize an unsupported future version", () => {
    const workspace = createValidWorkspaceFixture();
    workspace.schemaVersion = 2;

    expect(() => normalizeWorkspaceDocument(workspace, { clock: fixedClock })).toThrow(
      "Unsupported workspace schema version: 2",
    );
  });

  it("rejects duplicate entity ids within a project graph", () => {
    const workspace = createValidWorkspaceFixture();
    const project = workspace.projects[0];
    project.datasets.push(structuredClone(project.datasets[0]));
    project.charts.push(structuredClone(project.charts[0]));
    project.dashboards.push(structuredClone(project.dashboards[0]));
    project.shares.push(structuredClone(project.shares[0]));
    project.dashboards[0].widgets.push(structuredClone(project.dashboards[0].widgets[0]));

    const result = validateWorkspaceDocument(workspace);

    expect(result.errors).toEqual(expect.arrayContaining([
      "dataset ids must be unique within project project-1",
      "chart ids must be unique within project project-1",
      "dashboard ids must be unique within project project-1",
      "share ids must be unique within project project-1",
      "widget ids must be unique within dashboard dashboard-1",
    ]));
  });

  it("rejects malformed nested entity collections instead of normalizing them away", () => {
    ["datasets", "charts", "dashboards", "shares", "connectionProfiles", "legacySheetAliases"].forEach((collection) => {
      const workspace = createValidWorkspaceFixture();
      workspace.projects[0][collection] = { unexpected: true };

      const result = validateWorkspaceDocument(workspace);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`project project-1 ${collection} must be an array`);
    });
  });

  it("rejects malformed dataset, widget, and Sheet-alias collections", () => {
    const workspace = createValidWorkspaceFixture();
    workspace.projects[0].datasets[0].fields = { unexpected: true };
    workspace.projects[0].datasets[0].rows = { unexpected: true };
    workspace.projects[0].dashboards[0].widgets = { unexpected: true };
    workspace.projects[0].legacySheetAliases[0].dashboardIds = { unexpected: true };

    const result = validateWorkspaceDocument(workspace);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "dataset dataset-1 fields must be an array",
      "dataset dataset-1 rows must be an array",
      "dashboard dashboard-1 widgets must be an array",
      "sheet alias sheet-1 dashboardIds must be an array",
    ]));
  });

  it.each([
    ["dataset record", (workspace) => { workspace.projects[0].datasets[0] = 7; }, "every dataset must be an object with a non-empty id"],
    ["dataset id", (workspace) => { workspace.projects[0].datasets[0].id = " "; }, "every dataset must be an object with a non-empty id"],
    ["dataset field", (workspace) => { workspace.projects[0].datasets[0].fields = [7]; }, "dataset dataset-1 fields must contain objects with non-empty ids"],
    ["dataset row", (workspace) => { workspace.projects[0].datasets[0].rows = ["invalid"]; }, "dataset dataset-1 rows must contain objects"],
    ["chart record", (workspace) => { workspace.projects[0].charts[0] = null; }, "every chart must be an object with a non-empty id"],
    ["chart config", (workspace) => { workspace.projects[0].charts[0].config = []; }, "chart chart-1 config must be an object"],
    ["chart data contract", (workspace) => { workspace.projects[0].charts[0].dataContract = { fields: [7], rows: ["invalid"] }; }, "chart chart-1 dataContract must contain object fields and rows"],
    ["dashboard record", (workspace) => { workspace.projects[0].dashboards[0].id = ""; }, "every dashboard must be an object with a non-empty id"],
    ["widget record", (workspace) => { workspace.projects[0].dashboards[0].widgets[0] = 3; }, "every widget in dashboard dashboard-1 must be an object with a non-empty id"],
    ["widget layout", (workspace) => { workspace.projects[0].dashboards[0].widgets[0].layout = null; }, "widget widget-1 layout must be an object"],
    ["share record", (workspace) => { workspace.projects[0].shares[0].id = null; }, "every share must be an object with a non-empty id"],
    ["share snapshot", (workspace) => { workspace.projects[0].shares[0].snapshot = []; }, "share share-1 snapshot must be an object"],
    ["sheet alias", (workspace) => { workspace.projects[0].legacySheetAliases[0].sheetId = ""; }, "every sheet alias must have a non-empty sheetId"],
  ])("rejects malformed %s structures", (_label, mutate, expectedError) => {
    const workspace = createValidWorkspaceFixture();
    mutate(workspace);

    const result = validateWorkspaceDocument(workspace);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expectedError);
  });

  it("rejects duplicate connection-profile and Sheet-alias ids", () => {
    const workspace = createValidWorkspaceFixture();
    workspace.projects[0].connectionProfiles = [
      { id: "connection-1", projectId: "project-1", displayName: "One", connectorType: "demo", host: "localhost", port: "", capabilities: [], status: "demo" },
      { id: "connection-1", projectId: "project-1", displayName: "Two", connectorType: "demo", host: "localhost", port: "", capabilities: [], status: "demo" },
    ];
    workspace.projects[0].legacySheetAliases.push(structuredClone(workspace.projects[0].legacySheetAliases[0]));

    const result = validateWorkspaceDocument(workspace);

    expect(result.errors).toEqual(expect.arrayContaining([
      "connection profile ids must be unique within project project-1",
      "sheet alias ids must be unique within project project-1",
    ]));
  });

  it("allows only whitelisted non-sensitive connection metadata", () => {
    const workspace = createValidWorkspaceFixture();
    workspace.projects[0].connectionProfiles.push({
      id: "connection-1",
      projectId: "project-1",
      displayName: "Warehouse metadata",
      connectorType: "postgres",
      host: "warehouse.internal",
      port: "5432",
      capabilities: ["preview"],
      status: "demo",
      database: "should-not-be-canonical",
    });

    const result = validateWorkspaceDocument(workspace);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("connection profile connection-1 contains non-whitelisted field: database");
  });

  it("reports sheet aliases that point to missing dashboards", () => {
    const workspace = createValidWorkspaceFixture();
    workspace.projects[0].legacySheetAliases[0].dashboardIds.push("missing-dashboard");

    const result = validateWorkspaceDocument(workspace);

    expect(result.valid).toBe(true);
    expect(result.warnings).toContain("sheet alias sheet-1 references a missing dashboard: missing-dashboard");
  });
});
