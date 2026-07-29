import { apiRequest, encodeApiPathSegment, isMockMode } from "@infrastructure/http/client";
import { useStore } from "@app/store/useStore";

export const API_ACTIVE_PROJECT_KEY = "mini-bi-api-active-project-id";

export function resolveApiActiveProject(projects, preferredProjectId, activeProjectId) {
  return projects.find((project) => project.id === preferredProjectId)
    ?? projects.find((project) => project.id === activeProjectId)
    ?? projects[0]
    ?? null;
}

export async function getProjects() {
  if (isMockMode()) return useStore.getState().projects;
  return apiRequest("/api/v1/projects");
}

export async function createProject(name) {
  if (isMockMode()) {
    useStore.getState().createProject(name);
    return useStore.getState().projects.at(-1) ?? null;
  }

  return apiRequest("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateProject(projectId, { name, revision }) {
  if (isMockMode()) {
    useStore.getState().updateProject?.(projectId, { name });
    return useStore.getState().projects.find((project) => project.id === projectId) ?? null;
  }
  return apiRequest(`/api/v1/projects/${encodeApiPathSegment(projectId)}`, {
    method: "PATCH",
    body: JSON.stringify({ name, revision }),
  });
}

export async function archiveProject(projectId, revision) {
  if (isMockMode()) {
    useStore.getState().deleteProject?.(projectId);
    return { success: true };
  }
  return apiRequest(`/api/v1/projects/${encodeApiPathSegment(projectId)}`, {
    method: "DELETE",
    body: JSON.stringify({ revision }),
  });
}

