import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest, encodeApiPathSegment } from "./client";

afterEach(() => {
  delete globalThis.dashboardMiniBiAuth;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("encodeApiPathSegment", () => {
  it.each([
    ["../projects/target", "..%2Fprojects%2Ftarget"],
    ["id/child", "id%2Fchild"],
    ["id?admin=true", "id%3Fadmin%3Dtrue"],
    ["id#fragment", "id%23fragment"],
    ["id\\child", "id%5Cchild"],
    ["already%2Fencoded", "already%252Fencoded"],
  ])("encodes an untrusted path segment %s", (value, expected) => {
    expect(encodeApiPathSegment(value)).toBe(expected);
  });

  it("preserves canonical entity identifiers", () => {
    expect(encodeApiPathSegment("chart-123_ABC")).toBe("chart-123_ABC");
  });
});

describe("HTTP response and cancellation contract", () => {
  it("unwraps successful envelopes using only same-origin application-session credentials", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: { id: "project-1" }, requestId: "request-1" }), { status: 200 }));

    await expect(apiRequest("/api/v1/projects")).resolves.toEqual({ id: "project-1" });
    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/projects", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("maps API errors and broadcasts only authentication expiry", async () => {
    const expired = vi.fn();
    window.addEventListener("mini-bi:session-expired", expired, { once: true });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: "AUTHENTICATION_REQUIRED", message: "Authentication is required." }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: "FORBIDDEN", message: "Forbidden." }), { status: 403 }));

    await expect(apiRequest("/api/v1/auth/me")).rejects.toMatchObject({ status: 401, code: "AUTHENTICATION_REQUIRED" });
    expect(expired).toHaveBeenCalledTimes(1);
    await expect(apiRequest("/api/v1/projects", { method: "POST", body: "{}" })).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("keeps the internal timeout active when the caller supplies an AbortSignal", async () => {
    vi.useFakeTimers();
    const external = new AbortController();
    let requestSignal;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, options) => {
      requestSignal = options.signal;
      return new Promise((_resolve, reject) => requestSignal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true }));
    });

    const request = apiRequest("/api/v1/slow", { signal: external.signal });
    const rejection = expect(request).rejects.toThrow("Request timed out. Please try again.");
    await vi.advanceTimersByTimeAsync(15_000);
    expect(requestSignal.aborted).toBe(true);
    expect(external.signal.aborted).toBe(false);
    await rejection;
  });

  it("uses same-origin application-session cookies without adding a browser bearer token", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { authenticated: true } }), { status: 200 }),
    );

    await apiRequest("/api/session/me");

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.credentials).toBe("same-origin");
    expect(options.headers).not.toHaveProperty("Authorization");
  });

  it("adds the double-submit CSRF token only to unsafe same-origin requests", async () => {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      value: "dashboardmini_csrf=csrf_token_123456789012345678901234567890",
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { saved: true } }), { status: 200 }),
    );

    await apiRequest("/api/v1/projects", { method: "POST", body: "{}" });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers["X-CSRF-Token"]).toBe("csrf_token_123456789012345678901234567890");
  });
});

describe("HTTP client runtime mode", () => {
  it("does not enable mock data when VITE_USE_MOCK is omitted", async () => {
    vi.stubEnv("VITE_USE_MOCK", "");
    vi.resetModules();

    const { isMockMode } = await import("./client.js");

    expect(isMockMode()).toBe(false);
  });

  it("enables mock data only when explicitly requested in development or test", async () => {
    vi.stubEnv("VITE_USE_MOCK", "true");
    vi.resetModules();

    const { isMockMode } = await import("./client.js");

    expect(isMockMode()).toBe(true);
  });
});
