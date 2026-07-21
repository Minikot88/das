import { describe, expect, it } from "vitest";
import { scanForSecretMaterial } from "@domain/workspace/workspaceSchema";
import {
  createLocalReadonlyShare,
  createLocalShareUrl,
  normalizeLocalShareRecord,
  resolveLocalShare,
  validateLocalShare,
} from "@domain/shares/localShareContract";

function fixture() {
  const project = { id: "project-1", name: "Sales" };
  const dashboard = {
    id: "dashboard-1",
    projectId: "project-1",
    name: "Executive",
    widgets: [{ id: "widget-1", projectId: "project-1", dashboardId: "dashboard-1", type: "text", config: { text: "Ready" } }],
    layout: [{ i: "widget-1", x: 0, y: 0, w: 4, h: 2 }],
  };
  return { project, dashboard };
}

describe("local readonly share contract", () => {
  it("creates an owned, secret-free readonly snapshot", () => {
    const { project, dashboard } = fixture();
    dashboard.widgets[0].config.password = "synthetic-secret";
    dashboard.widgets[0].config.connectionUrl = "postgres://user:pass@example.test/db";
    dashboard.widgets[0].config.signedUrl = "https://example.test/data?X-Amz-Signature=synthetic-secret";

    const share = createLocalReadonlyShare({
      id: "share-1",
      project,
      dashboard,
      createdAt: "2026-07-11T00:00:00.000Z",
    });

    expect(share).toMatchObject({
      id: "share-1",
      projectId: "project-1",
      dashboardId: "dashboard-1",
      mode: "local-readonly",
    });
    expect(scanForSecretMaterial(share)).toEqual([]);
    expect(share.snapshot.widgets[0].config).not.toHaveProperty("password");
    expect(share.snapshot.widgets[0].config.connectionUrl).toBeUndefined();
    expect(share.snapshot.widgets[0].config.signedUrl).toBeUndefined();
    expect(validateLocalShare(share)).toEqual({ valid: true, errors: [] });
  });

  it("preserves credential-named chart row columns while removing app-owned secrets", () => {
    const { project, dashboard } = fixture();
    dashboard.widgets[0].config = {
      token: "SYNTHETIC_APP_TOKEN_SENTINEL",
      rows: [{
        token: "customer-segment",
        sourceUrl: "https://example.test/report?range=A1&X-Amz-Signature=dimension-value#oauth_token=cohort-value",
      }],
    };

    const share = createLocalReadonlyShare({ id: "share-row-data", project, dashboard });

    expect(share.snapshot.widgets[0].config).not.toHaveProperty("token");
    expect(share.snapshot.widgets[0].config.rows[0]).toEqual({
      token: "customer-segment",
      sourceUrl: "https://example.test/report?range=A1",
    });
    expect(validateLocalShare(share)).toEqual({ valid: true, errors: [] });
  });

  it("rejects invalid ownership, invalid modes, and editable snapshots", () => {
    const { project, dashboard } = fixture();
    const share = createLocalReadonlyShare({ id: "share-1", project, dashboard });

    expect(validateLocalShare({ ...share, projectId: "other" }, { project, dashboard }).valid).toBe(false);
    expect(validateLocalShare({ ...share, mode: "public" }).valid).toBe(false);
    expect(validateLocalShare({ ...share, snapshot: { ...share.snapshot, editable: true } }).valid).toBe(false);
    expect(validateLocalShare({ ...share, availability: "unavailable" }).valid).toBe(false);
  });

  it("resolves ready, missing, invalid, and expired states", () => {
    const { project, dashboard } = fixture();
    const share = createLocalReadonlyShare({
      id: "share-1",
      project,
      dashboard,
      createdAt: "2026-07-11T00:00:00.000Z",
      expiresAt: "2026-07-12T00:00:00.000Z",
    });
    const workspace = { projects: [{ ...project, dashboards: [dashboard], shares: [share] }] };

    expect(resolveLocalShare(workspace, "share-1", { now: "2026-07-11T12:00:00.000Z" }).status).toBe("ready");
    expect(resolveLocalShare(workspace, "missing").status).toBe("missing");
    expect(resolveLocalShare(workspace, "share-1", { now: "2026-07-13T00:00:00.000Z" }).status).toBe("expired");
    expect(resolveLocalShare({ projects: [{ ...project, dashboards: [], shares: [share] }] }, "share-1").status).toBe("invalid");
  });

  it("fails closed when the same share id exists in more than one project", () => {
    const { project, dashboard } = fixture();
    const first = createLocalReadonlyShare({ id: "duplicate-share", project, dashboard });
    const secondProject = { id: "project-2", name: "Other" };
    const secondDashboard = { ...dashboard, id: "dashboard-2", projectId: "project-2" };
    const second = createLocalReadonlyShare({ id: "duplicate-share", project: secondProject, dashboard: secondDashboard });
    const workspace = {
      projects: [
        { ...project, dashboards: [dashboard], shares: [first] },
        { ...secondProject, dashboards: [secondDashboard], shares: [second] },
      ],
    };

    const result = resolveLocalShare(workspace, "duplicate-share");

    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("share id is ambiguous across projects");
  });

  it("builds view/embed URLs that always carry the local share token", () => {
    expect(createLocalShareUrl({ origin: "https://example.test", dashboardId: "dashboard-1", shareId: "share-1" }))
      .toBe("https://example.test/dashboard/dashboard-1/view?share=share-1");
    expect(createLocalShareUrl({ origin: "https://example.test", dashboardId: "dashboard-1", shareId: "share-1", mode: "embed", showHeader: false }))
      .toBe("https://example.test/dashboard/dashboard-1/embed?share=share-1&header=0");
    expect(() => createLocalShareUrl({ origin: "https://example.test", dashboardId: "dashboard-1" })).toThrow("shareId");
  });

  it("normalizes legacy readonly records without retaining unsafe snapshot fields", () => {
    const normalized = normalizeLocalShareRecord({
      id: "legacy-share",
      projectId: "project-1",
      dashboardId: "dashboard-1",
      sheetId: "sheet-1",
      mode: "dashboard-readonly",
      snapshot: { password: "synthetic", title: "Legacy" },
    });

    expect(normalized).toMatchObject({ mode: "local-readonly", legacySheetId: "sheet-1" });
    expect(normalized.snapshot).toMatchObject({ title: "Legacy", dashboardId: "dashboard-1", editable: false });
    expect(normalized.snapshot).not.toHaveProperty("password");
  });
});
