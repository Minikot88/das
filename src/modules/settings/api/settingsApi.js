import { apiRequest, isMockMode } from "@infrastructure/http/client";

export async function loadPreferences() {
  if (isMockMode()) return null;
  return apiRequest("/api/v1/settings/preferences");
}

export async function savePreferences(preferences) {
  if (isMockMode()) return null;
  return apiRequest("/api/v1/settings/preferences", {
    method: "PATCH",
    body: JSON.stringify(preferences),
  });
}
