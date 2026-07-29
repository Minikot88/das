import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();

vi.mock("@infrastructure/http/client", () => ({
  apiRequest,
  encodeApiPathSegment: encodeURIComponent,
  isMockMode: () => false,
}));
vi.mock("@app/store/useStore", () => ({ useStore: { getState: vi.fn() } }));

describe("projectApi production contract", () => {
  beforeEach(() => apiRequest.mockReset());

  it("keeps the persisted API project ahead of stale local workspace state", async () => {
    const { resolveApiActiveProject } = await import("./projectApi");
    const projects = [{ id: "legacy" }, { id: "api" }];
    expect(resolveApiActiveProject(projects, "api", "legacy")).toEqual(projects[1]);
  });

  it("uses canonical v1 endpoints for reads and creates", async () => {
    apiRequest.mockResolvedValueOnce([]).mockResolvedValueOnce({ id: "p-1" });
    const { createProject, getProjects } = await import("./projectApi");
    await getProjects();
    await createProject("API project");
    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/v1/projects");
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/v1/projects", {
      method: "POST",
      body: JSON.stringify({ name: "API project" }),
    });
  });

  it("includes revision when updating and deleting", async () => {
    apiRequest.mockResolvedValue({});
    const { archiveProject, updateProject } = await import("./projectApi");
    await updateProject("p/1", { name: "Renamed", revision: 4 });
    await archiveProject("p/1", 5);
    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/v1/projects/p%2F1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Renamed", revision: 4 }),
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/v1/projects/p%2F1", {
      method: "DELETE",
      body: JSON.stringify({ revision: 5 }),
    });
  });
});
