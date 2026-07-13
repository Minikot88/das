import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalReadonlyShare } from "@/domain/shares/localShareContract";
import DashboardPublicPage from "./DashboardPublicPage";

let workspace;
const storeState = {
  projects: [],
  charts: [],
  theme: "light",
  resolveShareLink: () => null,
};

vi.mock("@/domain/workspace/workspaceSelectors", () => ({
  useWorkspaceSelector: (selector) => selector(workspace),
}));

vi.mock("@/store/useStore", () => ({
  useStore: (selector) => selector(storeState),
}));

vi.mock("@/components/dashboard/DashboardGrid", () => ({
  default: ({ widgets, isEditable }) => (
    <div data-testid="readonly-grid" data-editable={String(isEditable)}>
      {widgets.map((widget) => <span key={widget.id}>{widget.title}</span>)}
    </div>
  ),
}));

function createFixture({ expiresAt, editable = false } = {}) {
  const project = { id: "project-1", name: "Sales" };
  const dashboard = {
    id: "dashboard-1",
    projectId: "project-1",
    name: "Executive",
    widgets: [{
      id: "widget-1",
      projectId: "project-1",
      dashboardId: "dashboard-1",
      type: "kpi",
      title: "Revenue",
      config: { metricTitle: "Revenue", value: "12.8M", comparison: "+18.4%" },
    }],
    layout: [],
    canvasSettings: { width: 1440, height: 900 },
  };
  const share = createLocalReadonlyShare({
    id: "share-1",
    project,
    dashboard,
    createdAt: "2026-07-11T00:00:00.000Z",
    expiresAt,
  });
  share.snapshot.editable = editable;
  return { projects: [{ ...project, dashboards: [dashboard], shares: [share] }] };
}

function renderRoute(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard/:dashboardId/view" element={<DashboardPublicPage />} />
        <Route path="/dashboard/:dashboardId/embed" element={<DashboardPublicPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("local dashboard view and embed routes", () => {
  beforeEach(() => {
    workspace = createFixture();
    storeState.projects = [];
    storeState.charts = [];
    storeState.resolveShareLink = () => null;
  });

  it("renders a valid exact readonly snapshot without editing controls", () => {
    renderRoute("/dashboard/dashboard-1/view?share=share-1");

    expect(screen.getByRole("heading", { name: "Executive" })).toBeInTheDocument();
    expect(screen.getByText("12.8M")).toBeInTheDocument();
    expect(screen.getByText("+18.4%")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(document.querySelector("[contenteditable='true']")).toBeNull();
  });

  it("hides the header in embed mode when header=0", () => {
    const { container } = renderRoute("/dashboard/dashboard-1/embed?share=share-1&header=0");

    expect(container.querySelector(".dashboard-public-header")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Executive" })).toHaveClass("sr-only");
    expect(screen.getByText("12.8M")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([
    ["missing", { projects: [] }, "ไม่พบลิงก์นี้ในเบราว์เซอร์ปัจจุบัน"],
    ["invalid", createFixture({ editable: true }), "ข้อมูลแชร์ภายในเครื่องไม่สมบูรณ์"],
    ["expired", createFixture({ expiresAt: "2026-07-10T00:00:00.000Z" }), "ลิงก์ภายในเบราว์เซอร์นี้หมดอายุแล้ว"],
  ])("fails closed for a %s local share", (_state, nextWorkspace, description) => {
    workspace = nextWorkspace;
    renderRoute("/dashboard/dashboard-1/view?share=share-1");

    expect(screen.getByRole("heading", { name: "ไม่พบแดชบอร์ด" })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(description))).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("rejects a token whose snapshot belongs to a different dashboard", () => {
    renderRoute("/dashboard/other-dashboard/view?share=share-1");

    expect(screen.getByRole("heading", { name: "ไม่พบแดชบอร์ด" })).toBeInTheDocument();
  });

  it("rejects a legacy fallback whose claimed project does not own the dashboard", () => {
    const legacyWorkspace = createFixture();
    const project = legacyWorkspace.projects[0];
    const dashboard = project.dashboards[0];
    const share = { ...project.shares[0], projectId: "attacker-project" };
    workspace = { projects: [] };
    storeState.projects = [{
      id: project.id,
      name: project.name,
      sheets: [{ id: "sheet-1", name: "Sheet", dashboards: [dashboard] }],
    }];
    storeState.resolveShareLink = () => share;

    renderRoute("/dashboard/dashboard-1/view?share=share-1");

    expect(screen.queryByText("12.8M")).not.toBeInTheDocument();
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });

  it("expires an already-open local view when its expiry time is reached", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T00:00:00.000Z"));
    try {
      workspace = createFixture({ expiresAt: "2026-07-11T00:00:01.000Z" });
      renderRoute("/dashboard/dashboard-1/view?share=share-1");
      expect(screen.getByRole("heading", { name: "Executive" })).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1001);
      });

      expect(screen.getByRole("heading", { name: "ไม่พบแดชบอร์ด" })).toBeInTheDocument();
      expect(screen.getByText(/หมดอายุแล้ว/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
