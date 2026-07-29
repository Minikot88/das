import { describe, expect, it, vi } from "vitest";

vi.mock("@infrastructure/persistence/project-storage/projectStorage", () => ({
  getActiveProject: (projects) => projects[0] ?? null,
}));

import { resolveHomeActiveProject } from "./homeProjectSelection";

describe("resolveHomeActiveProject", () => {
  const projects = [
    { id: "project-default", name: "Default" },
    { id: "project-api", name: "API project" },
  ];

  it("prefers the API project preference over legacy workspace state", () => {
    expect(resolveHomeActiveProject(projects, {
      mockMode: false,
      activeProjectId: "project-default",
      preferredProjectId: "project-api",
    })).toEqual(projects[1]);
  });

  it("falls back to the current API project and then the first project", () => {
    expect(resolveHomeActiveProject(projects, {
      mockMode: false,
      activeProjectId: "project-api",
    })).toEqual(projects[1]);
    expect(resolveHomeActiveProject(projects, {
      mockMode: false,
      activeProjectId: "missing",
    })).toEqual(projects[0]);
  });

  it("delegates explicit mock mode to the local workspace resolver", () => {
    const resolveMockProject = vi.fn(() => projects[1]);
    expect(resolveHomeActiveProject(projects, {
      mockMode: true,
      resolveMockProject,
    })).toEqual(projects[1]);
    expect(resolveMockProject).toHaveBeenCalledWith(projects);
  });
});
