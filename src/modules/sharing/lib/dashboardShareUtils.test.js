import { describe, expect, it } from "vitest";
import {
  buildDashboardEmbedCode,
  buildDashboardViewUrl,
  createSingleImagePdf,
  resolveDashboardViewOptions,
  sanitizeFileName,
} from "@modules/sharing/lib/dashboardShareUtils";

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

  it("creates a valid single-image PDF byte stream", () => {
    const bytes = createSingleImagePdf({
      imageBytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      width: 640,
      height: 360,
    });
    const text = new TextDecoder().decode(bytes);

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Subtype /Image");
  });
});
