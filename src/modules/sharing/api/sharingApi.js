import { apiRequest, encodeApiPathSegment, isMockMode } from "@infrastructure/http/client";

export async function createPersistentDashboardShare(dashboardId, allowedOrigins = []) {
  if (isMockMode()) return null;
  return apiRequest("/api/v1/shares", { method: "POST", body: JSON.stringify({ dashboardId, allowedOrigins }) });
}

export async function importWorkspaceForServerShare(workspace) {
  if (isMockMode()) return null;
  return apiRequest("/api/v1/workspace/import", { method: "POST", body: JSON.stringify(workspace) });
}

export async function resolvePersistentDashboardShare(token) {
  if (isMockMode()) return null;
  return apiRequest(`/api/v1/shares/${encodeApiPathSegment(token)}`);
}

export async function revokePersistentDashboardShare(id, revision) {
  if (isMockMode()) return null;
  return apiRequest(`/api/v1/shares/${encodeApiPathSegment(id)}/revoke`, {
    method: "PATCH",
    body: JSON.stringify({ revision }),
  });
}
