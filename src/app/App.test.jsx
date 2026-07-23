import React from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadCurrentUser: vi.fn(),
  setAuthAnonymous: vi.fn(),
}));

vi.mock("@modules/auth/api/authApi", () => ({ loadCurrentUser: mocks.loadCurrentUser }));
vi.mock("@infrastructure/http/client", () => ({ isMockMode: () => false }));
vi.mock("@shared/lib/themeMode", () => ({ applyThemeMode: vi.fn() }));
vi.mock("@app/router/AppRoutes", () => ({ default: () => <div>Routes ready</div> }));
vi.mock("@app/store/useStore", () => {
  const useStore = (selector) => selector({ theme: "light" });
  useStore.getState = () => ({ setAuthAnonymous: mocks.setAuthAnonymous });
  return { useStore };
});

const { default: App } = await import("./App");

describe("authentication bootstrap lifecycle", () => {
  beforeEach(() => {
    mocks.loadCurrentUser.mockReset();
    mocks.setAuthAnonymous.mockReset();
  });

  it("removes the session-expired listener and ignores a late bootstrap failure after unmount", async () => {
    let rejectBootstrap;
    mocks.loadCurrentUser.mockReturnValue(new Promise((_resolve, reject) => { rejectBootstrap = reject; }));
    const view = render(<App />);
    expect(mocks.loadCurrentUser).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new CustomEvent("mini-bi:session-expired"));
    expect(mocks.setAuthAnonymous).toHaveBeenCalledTimes(1);
    view.unmount();
    window.dispatchEvent(new CustomEvent("mini-bi:session-expired"));
    expect(mocks.setAuthAnonymous).toHaveBeenCalledTimes(1);

    await act(async () => rejectBootstrap(new Error("network unavailable")));
    expect(mocks.setAuthAnonymous).toHaveBeenCalledTimes(1);
  });
});
