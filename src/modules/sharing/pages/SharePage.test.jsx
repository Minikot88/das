import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalReadonlyShare } from "@domain/shares/localShareContract";
import SharePage from "@modules/sharing/pages/SharePage";

let workspace;
let storeState;

vi.mock("@app/store/useWorkspaceSelector", () => ({
  useWorkspaceSelector: (selector) => selector(workspace),
}));

vi.mock("@app/store/useStore", () => ({
  useStore: (selector) => selector(storeState),
}));

function RedirectTarget() {
  const location = useLocation();
  return <div data-testid="redirect-target">{location.pathname}{location.search}</div>;
}

function fixture({ expiresAt = null } = {}) {
  const project = { id: "project-1", name: "Sales" };
  const dashboard = { id: "dashboard-1", projectId: "project-1", name: "Executive", widgets: [], layout: [] };
  const share = createLocalReadonlyShare({
    id: "share-1",
    project,
    dashboard,
    createdAt: "2026-07-11T00:00:00.000Z",
    expiresAt,
  });
  return { project, dashboard, share };
}

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={["/share/share-1"]}>
      <Routes>
        <Route path="/share/:sheetId" element={<SharePage />} />
        <Route path="/dashboard/:dashboardId/view" element={<RedirectTarget />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("legacy share route security boundary", () => {
  beforeEach(() => {
    const { project, dashboard, share } = fixture();
    workspace = { projects: [{ ...project, dashboards: [dashboard], shares: [share] }] };
    storeState = { projects: [], charts: [], resolveShareLink: () => null };
  });

  it("redirects a validated canonical share to its readonly snapshot route", async () => {
    renderRoute();

    expect(await screen.findByTestId("redirect-target")).toHaveTextContent(
      "/dashboard/dashboard-1/view?share=share-1",
    );
  });

  it("fails closed when a legacy fallback claims the wrong project owner", () => {
    const { dashboard, share } = fixture();
    workspace = { projects: [] };
    storeState = {
      projects: [{
        id: "project-1",
        name: "Sales",
        sheets: [{ id: "sheet-1", name: "Sheet", dashboards: [dashboard] }],
      }],
      charts: [],
      resolveShareLink: () => ({ ...share, projectId: "attacker-project" }),
    };

    renderRoute();

    expect(screen.queryByTestId("redirect-target")).not.toBeInTheDocument();
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });

  it("fails closed when a legacy fallback has expired", () => {
    const { project, dashboard, share } = fixture({ expiresAt: "2020-01-01T00:00:00.000Z" });
    workspace = { projects: [] };
    storeState = {
      projects: [{
        ...project,
        sheets: [{ id: "sheet-1", name: "Sheet", dashboards: [dashboard] }],
      }],
      charts: [],
      resolveShareLink: () => share,
    };

    renderRoute();

    expect(screen.queryByTestId("redirect-target")).not.toBeInTheDocument();
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });
});
