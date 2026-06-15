import { describe, expect, it } from "vitest";
import {
  buildDashboardEmbedCode,
  buildDashboardViewUrl,
  resolveDashboardViewOptions,
  sanitizeFileName,
} from "./dashboardShareUtils";

describe("dashboard share utilities", () => {
  it("builds local share URLs and embed code safely", () => {
    const url = buildDashboardViewUrl({
      origin: "https://example.test",
      dashboardId: "dash-1",
      mode: "embed",
      theme: "dark",
      showHeader: false,
      shareId: "share-1",
    });

    expect(url).toBe("https://example.test/dashboard/dash-1/embed?share=share-1&theme=dark&header=0");
    expect(buildDashboardEmbedCode({ src: url })).toContain("strict-origin-when-cross-origin");
    expect(resolveDashboardViewOptions("?theme=dark&header=0", "embed")).toEqual({
      mode: "embed",
      theme: "dark",
      showHeader: false,
    });
    expect(sanitizeFileName("Executive Dashboard 2026!")).toBe("executive-dashboard-2026");
  });
});
