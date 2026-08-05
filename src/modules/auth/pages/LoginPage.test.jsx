import { describe, expect, it } from "vitest";
import { resolveLoginRedirect } from "@modules/auth/lib/loginRedirect";

describe("login redirect target", () => {
  it("preserves the protected route query and hash", () => {
    expect(resolveLoginRedirect({
      pathname: "/dashboard/dashboard-1/view",
      search: "?share=local-1&header=0",
      hash: "#widget-2",
    })).toBe("/dashboard/dashboard-1/view?share=local-1&header=0#widget-2");
  });

  it("rejects non-local redirect targets", () => {
    expect(resolveLoginRedirect({ pathname: "//example.test/phish" })).toBe("/dashboard");
    expect(resolveLoginRedirect(null)).toBe("/dashboard");
  });

  it("rejects encoded and backslash redirect payloads that can be interpreted as external", () => {
    expect(resolveLoginRedirect({ pathname: "javascript:alert(1)" })).toBe("/dashboard");
    expect(resolveLoginRedirect({ pathname: "https://example.test/phish" })).toBe("/dashboard");
    expect(resolveLoginRedirect({ pathname: "/\\\\example.test/phish" })).toBe("/dashboard");
    expect(resolveLoginRedirect({ pathname: "/%2f%2fexample.test/phish" })).toBe("/dashboard");
    expect(resolveLoginRedirect({ pathname: "/%5cexample.test/phish" })).toBe("/dashboard");
  });
});
