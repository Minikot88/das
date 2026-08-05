import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn().mockResolvedValue({
  authenticated: true,
  authMode: "disabled",
  actorId: "technical-user",
  displayName: "Technical User",
  organizationId: "org-1",
  roles: ["organization_admin"],
  projectScopes: [],
});

vi.mock("@infrastructure/http/client", () => ({ apiRequest }));
vi.mock("@shared/lib/themeMode", () => ({ applyThemeMode: vi.fn() }));
vi.mock("@app/router/AppRoutes", () => ({ default: () => <div>Routes ready</div> }));
vi.mock("@app/store/useStore", () => ({ useStore: (selector) => selector({ theme: "light" }) }));

const { default: App } = await import("./App");

describe("external session bootstrap", () => {
  it("loads the server-authoritative session without using a local auth store", async () => {
    render(<App />);
    expect(await screen.findByText("Routes ready")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith("/api/session/me");
  });
});
