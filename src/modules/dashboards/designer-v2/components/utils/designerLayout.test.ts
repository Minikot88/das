import { describe, expect, it } from "vitest";
import { designerLayoutForWidth, shouldRenderDesignerPreview } from "@modules/dashboards/designer-v2/components/utils/designerLayout";

describe("Chart Designer responsive layout", () => {
  it.each([
    [1920, "desktop"],
    [1440, "desktop"],
    [1280, "laptop"],
    [768, "tablet"],
    [390, "mobile"],
  ] as const)("uses the expected settings layout at %dpx", (width, mode) => {
    expect(designerLayoutForWidth(width)).toBe(mode);
  });

  it("does not initialize the chart renderer inside hidden mobile steps", () => {
    expect(shouldRenderDesignerPreview(true, "tables", false)).toBe(false);
    expect(shouldRenderDesignerPreview(true, "relationships", false)).toBe(false);
    expect(shouldRenderDesignerPreview(true, "fields", false)).toBe(false);
    expect(shouldRenderDesignerPreview(true, "mapping", false)).toBe(false);
    expect(shouldRenderDesignerPreview(true, "preview", false)).toBe(true);
    expect(shouldRenderDesignerPreview(false, "mapping", false)).toBe(true);
  });
});
