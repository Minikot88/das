import { describe, expect, it } from "vitest";
import { resolveLoginRedirect } from "../utils/loginRedirect";

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
});
