import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DatasetsPage from "@modules/datasets/pages/DatasetsPage";

const datasets = [
  { id: "dataset-a", projectId: "project-a", name: "Project A dataset", fields: [], rows: [] },
  { id: "dataset-b", projectId: "project-b", name: "Project B dataset", fields: [], rows: [] },
];
const workspace = {
  active: { projectId: "project-a", dashboardId: null },
  projects: [
    { id: "project-a", datasets: [datasets[0]] },
    { id: "project-b", datasets: [datasets[1]] },
  ],
};
const storeState = {
  importedDatasets: datasets,
  activeProjectId: "project-a",
  importDataset: vi.fn(),
  deleteImportedDataset: vi.fn(),
  appSettings: { density: "comfortable" },
};

vi.mock("@/store/useStore", () => ({
  useStore: (selector) => selector(storeState),
}));

vi.mock("@/domain/workspace/workspaceSelectors", () => ({
  selectProjectDatasets: (snapshot, projectId) => snapshot.projects.find((project) => project.id === projectId)?.datasets ?? [],
  useWorkspaceSelector: (selector) => selector(workspace),
}));

vi.mock("@shared/components/ui/EnterpriseDataTable", () => ({ default: () => null }));

describe("DatasetsPage project ownership", () => {
  it("shows imported datasets from the active project only", () => {
    render(<MemoryRouter><DatasetsPage /></MemoryRouter>);

    expect(screen.getByText("Project A dataset")).toBeInTheDocument();
    expect(screen.queryByText("Project B dataset")).not.toBeInTheDocument();
  });
});
