import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("@infrastructure/http/client", () => ({
  isInternalSingleUserMode: () => true,
  isMockMode: () => false,
}));

vi.mock("@app/store/useStore", () => ({
  useStore: (selector) => selector({
    isAuthenticated: false,
    authStatus: "anonymous",
  }),
}));

vi.mock("@app/layouts/Layout", () => ({
  MainLayout: () => <Outlet />,
}));

vi.mock("@modules/auth/pages/LoginPage", () => ({
  default: () => <h1>Sign in</h1>,
}));

const { default: AppRoutes } = await import("./AppRoutes");

describe("protected route authentication", () => {
  it("shows login instead of mounting protected pages when internal frontend mode is not authenticated by the backend", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard-v2"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});
