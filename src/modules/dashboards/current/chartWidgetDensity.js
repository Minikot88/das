export function chartWidgetDensity(width, height) {
  const area = width * height;
  if (width < 170 || height < 110 || area < 18_000) return "micro";
  if (width < 300 || height < 180 || area < 45_000) return "mini";
  if (width < 520 || height < 280 || area < 115_000) return "compact";
  return "standard";
}
