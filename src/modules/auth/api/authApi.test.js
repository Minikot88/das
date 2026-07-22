import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const setAuthenticatedUser = vi.fn();
const logoutStore = vi.fn();

vi.mock("@infrastructure/http/client", () => ({ apiRequest, isMockMode: () => false }));
vi.mock("@app/store/useStore", () => ({
  useStore: { getState: () => ({ setAuthenticatedUser, logout: logoutStore }) },
}));

const auth = await import("./authApi");

beforeEach(() => {
  apiRequest.mockReset();
  setAuthenticatedUser.mockReset();
  logoutStore.mockReset();
});

describe("production authentication API contract", () => {
  it("uses canonical login and session bootstrap endpoints", async () => {
    const user = { id: "user-1", email: "user@example.test" };
    apiRequest.mockResolvedValue(user);
    await expect(auth.login({ email: user.email, password: "not-persisted" })).resolves.toEqual(user);
    expect(apiRequest).toHaveBeenLastCalledWith("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email: user.email, password: "not-persisted" }) });
    expect(setAuthenticatedUser).toHaveBeenCalledWith(user);

    await auth.loadCurrentUser();
    expect(apiRequest).toHaveBeenLastCalledWith("/api/v1/auth/me");
    expect(setAuthenticatedUser).toHaveBeenCalledTimes(2);
  });

  it("maps invitation, recovery, session, and member operations without unsafe path segments", async () => {
    apiRequest.mockResolvedValue({ success: true });
    await auth.register({ token: "invite", displayName: "User", password: "passphrase value" });
    await auth.forgotPassword("user@example.test");
    await auth.resetPassword("reset-token", "new passphrase value");
    await auth.revokeSession("../session/1");
    await auth.inviteOrganizationMember("org/1", { email: "new@example.test", role: "member" });
    await auth.updateOrganizationMember("org/1", "user/1", "organization_admin");
    await auth.setOrganizationMemberStatus("org/1", "user/1", "disabled");
    await auth.removeOrganizationMember("org/1", "user/1");
    await auth.createMemberPasswordReset("org/1", "user/1");

    expect(apiRequest.mock.calls.map(([path]) => path)).toEqual([
      "/api/v1/auth/accept-invitation",
      "/api/v1/auth/forgot-password",
      "/api/v1/auth/reset-password",
      "/api/v1/auth/sessions/..%2Fsession%2F1",
      "/api/v1/organizations/org%2F1/invitations",
      "/api/v1/organizations/org%2F1/members/user%2F1",
      "/api/v1/organizations/org%2F1/members/user%2F1",
      "/api/v1/organizations/org%2F1/members/user%2F1",
      "/api/v1/organizations/org%2F1/members/user%2F1/password-reset",
    ]);
  });

  it("clears local auth state only after the backend logout succeeds", async () => {
    apiRequest.mockRejectedValueOnce(Object.assign(new Error("offline"), { status: 503 }));
    await expect(auth.logout()).rejects.toMatchObject({ status: 503 });
    expect(logoutStore).not.toHaveBeenCalled();

    apiRequest.mockResolvedValueOnce({ success: true });
    await auth.logout();
    expect(apiRequest).toHaveBeenLastCalledWith("/api/v1/auth/logout", { method: "POST", body: "{}" });
    expect(logoutStore).toHaveBeenCalledTimes(1);
  });
});
