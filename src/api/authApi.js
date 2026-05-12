import { apiRequest, isMockMode } from "./client";
import { useStore } from "../store/useStore";

export async function login(payload) {
  if (isMockMode()) {
    // Mock auth is a client-only demo gate for local/frontend-only runs.
    // It must not be treated as production authentication.
    useStore.getState().login(payload.email, payload.password, payload.name);
    return useStore.getState().user;
  }

  const user = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  useStore.getState().setAuthenticatedUser(user);
  return user;
}

export async function register(payload) {
  if (isMockMode()) {
    // Mock auth is a client-only demo gate for local/frontend-only runs.
    // It must not be treated as production authentication.
    useStore.getState().register(payload.email, payload.password, payload.name);
    return useStore.getState().user;
  }

  const user = await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  useStore.getState().setAuthenticatedUser(user);
  return user;
}
