import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalSessionRequired, SessionGate, SessionProvider } from "./SessionProvider";
import { useSession } from "./sessionContext";

const mocks = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@infrastructure/http/client", () => ({ apiRequest: mocks.apiRequest }));
const apiRequest = mocks.apiRequest;

afterEach(() => {
  apiRequest.mockReset();
});

function SessionProbe() {
  const { session } = useSession();
  return <span>{session?.displayName}</span>;
}

describe("SessionProvider", () => {
  it("renders protected content only after /api/session/me succeeds", async () => {
    apiRequest.mockResolvedValue({
      authenticated: true,
      authMode: "external",
      actorId: "user-1",
      displayName: "Verified User",
      organizationId: "org-1",
      roles: ["viewer"],
      projectScopes: [],
    });
    render(
      <SessionProvider>
        <SessionGate fallback={<span>Loading</span>}><SessionProbe /></SessionGate>
      </SessionProvider>,
    );
    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(await screen.findByText("Verified User")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith("/api/session/me");
  });

  it("shows the external-session state for a 401 without a login redirect", async () => {
    apiRequest.mockRejectedValue(Object.assign(new Error("Authentication is required."), { status: 401 }));
    render(
      <SessionProvider>
        <SessionGate fallback={<span>Loading</span>}><span>Protected</span></SessionGate>
      </SessionProvider>,
    );
    expect(await screen.findByRole("heading", { name: "External session required" })).toBeInTheDocument();
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("invalidates the in-memory session when the API reports expiry", async () => {
    apiRequest.mockResolvedValue({ authenticated: true, displayName: "Verified User" });
    render(
      <SessionProvider>
        <SessionGate fallback={<span>Loading</span>}><SessionProbe /></SessionGate>
      </SessionProvider>,
    );
    expect(await screen.findByText("Verified User")).toBeInTheDocument();
    act(() => window.dispatchEvent(new CustomEvent("mini-bi:session-expired")));
    expect(await screen.findByRole("heading", { name: "External session required" })).toBeInTheDocument();
  });

  it("offers retry for service errors without fabricating a local user", async () => {
    apiRequest.mockRejectedValue(new Error("Network unavailable"));
    render(<SessionProvider><ExternalSessionRequired /></SessionProvider>);
    expect(await screen.findByRole("heading", { name: "Session service unavailable" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
