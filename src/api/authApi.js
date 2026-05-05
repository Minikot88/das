import { apiRequest, isMockMode } from "./client";
import { useStore } from "../store/useStore";

export async function login(payload) {
  if (isMockMode()) {
    useStore.getState().login(payload.email, payload.password, payload.name);
    return useStore.getState().user;
  }

  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function register(payload) {
  if (isMockMode()) {
    useStore.getState().register(payload.email, payload.password, payload.name);
    return useStore.getState().user;
  }

  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
