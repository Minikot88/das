import { apiRequest, isMockMode } from "@infrastructure/http/client";
import { useStore } from "@app/store/useStore";

export async function login(payload) {
  if (isMockMode()) {
    // Mock auth is a client-only demo gate for local/frontend-only runs.
    // It must not be treated as production authentication.
    useStore.getState().login(payload.email, payload.password, payload.name);
    return useStore.getState().user;
  }

  const user = await apiRequest("/api/v1/auth/login", {
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

  const user = await apiRequest("/api/v1/auth/accept-invitation", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return user;
}

export async function loadCurrentUser() {
  if (isMockMode()) return useStore.getState().user;
  const user = await apiRequest("/api/v1/auth/me");
  useStore.getState().setAuthenticatedUser(user);
  return user;
}

export async function logout() {
  if (!isMockMode()) await apiRequest("/api/v1/auth/logout", { method: "POST", body: "{}" });
  useStore.getState().logout();
}

export function forgotPassword(email) {
  return apiRequest("/api/v1/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

export function resetPassword(token, password) {
  return apiRequest("/api/v1/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
}

export function listSessions() { return apiRequest("/api/v1/auth/sessions"); }
export function revokeSession(id) { return apiRequest(`/api/v1/auth/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }); }
export function logoutAll() { return apiRequest("/api/v1/auth/logout-all", { method: "POST", body: "{}" }); }
export function changePassword(currentPassword, newPassword) { return apiRequest("/api/v1/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }); }
export function listOrganizationMembers(id) { return apiRequest(`/api/v1/organizations/${encodeURIComponent(id)}/members`); }
export function inviteOrganizationMember(id, input) { return apiRequest(`/api/v1/organizations/${encodeURIComponent(id)}/invitations`, { method: "POST", body: JSON.stringify(input) }); }
export function updateOrganizationMember(id, userId, role) { return apiRequest(`/api/v1/organizations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify({ role }) }); }
export function setOrganizationMemberStatus(id, userId, status) { return apiRequest(`/api/v1/organizations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify({ status }) }); }
export function removeOrganizationMember(id, userId) { return apiRequest(`/api/v1/organizations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" }); }
export function createMemberPasswordReset(id, userId) { return apiRequest(`/api/v1/organizations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}/password-reset`, { method: "POST", body: "{}" }); }
