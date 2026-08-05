import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SessionProvider } from "@modules/session/SessionProvider";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn().mockRejectedValue(Object.assign(new Error("Authentication is required."), { status: 401 })),
}));
vi.mock("@infrastructure/http/client", () => ({ apiRequest: mocks.apiRequest }));
vi.mock("@app/layouts/Layout", () => ({ MainLayout: () => <Outlet /> }));

const { default: AppRoutes } = await import("./AppRoutes");

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current route">{location.pathname}</output>;
}

describe("protected route external session boundary", () => {
  it("shows an external-session requirement without redirecting to built-in login", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard-v2"]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "External session required" })).toBeInTheDocument();
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
  });

  it.each(["/login", "/register", "/forgot-password", "/reset-password"])(
    "retires the built-in auth route %s",
    async (path) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <SessionProvider>
            <LocationProbe />
            <AppRoutes />
          </SessionProvider>
        </MemoryRouter>,
      );

      expect(await screen.findByLabelText("current route")).toHaveTextContent("/dashboard-v2");
      expect(screen.queryByRole("textbox", { name: /email/i })).not.toBeInTheDocument();
    },
  );
});
