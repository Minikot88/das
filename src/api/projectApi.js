import { apiRequest, isMockMode } from "./client";
import { useStore } from "../store/useStore";

export async function getProjects() {
  if (isMockMode()) return useStore.getState().projects;
  return apiRequest("/api/projects");
}

export async function createProject(name) {
  if (isMockMode()) {
    useStore.getState().createProject(name);
    return useStore.getState().projects.at(-1) ?? null;
  }

  return apiRequest("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

