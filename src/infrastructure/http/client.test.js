import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest, encodeApiPathSegment, csrfHeaderForRequest } from "./client";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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

describe("CSRF request protection", () => {
  it("copies the CSRF cookie into mutation headers but not safe reads", () => {
    Object.defineProperty(document, "cookie", { configurable: true, writable: true, value: "mini_bi_csrf=csrf%20value; theme=light" });
    expect(csrfHeaderForRequest("POST")).toEqual({ "X-CSRF-Token": "csrf value" });
    expect(csrfHeaderForRequest("GET")).toEqual({});
  });
});

describe("HTTP response and cancellation contract", () => {
  it("unwraps successful envelopes and sends same-origin credentials", async () => {
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
});
