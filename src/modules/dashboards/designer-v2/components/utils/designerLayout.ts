export type DesignerLayoutMode = "desktop" | "laptop" | "tablet" | "mobile";

export function designerLayoutForWidth(width: number): DesignerLayoutMode {
  if (width <= 600) return "mobile";
  if (width <= 820) return "tablet";
  if (width <= 1360) return "laptop";
  return "desktop";
}

export function shouldRenderDesignerPreview(compactLayout: boolean, activeStep: string, previewMode: boolean) {
  return previewMode || !compactLayout || activeStep === "preview";
}
