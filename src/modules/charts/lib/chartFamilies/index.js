import { lineCharts } from "@modules/charts/lib/chartFamilies/lineCharts";
import { areaCharts } from "@modules/charts/lib/chartFamilies/areaCharts";
import { barCharts } from "@modules/charts/lib/chartFamilies/barCharts";
import { pieCharts } from "@modules/charts/lib/chartFamilies/pieCharts";
import { scatterCharts } from "@modules/charts/lib/chartFamilies/scatterCharts";
import { bubbleCharts } from "@modules/charts/lib/chartFamilies/bubbleCharts";
import { mapCharts } from "@modules/charts/lib/chartFamilies/mapCharts";
import { candlestickCharts } from "@modules/charts/lib/chartFamilies/candlestickCharts";
import { radarCharts } from "@modules/charts/lib/chartFamilies/radarCharts";
import { polarCharts } from "@modules/charts/lib/chartFamilies/polarCharts";
import { boxplotCharts } from "@modules/charts/lib/chartFamilies/boxplotCharts";
import { heatmapCharts } from "@modules/charts/lib/chartFamilies/heatmapCharts";
import { graphCharts } from "@modules/charts/lib/chartFamilies/graphCharts";
import { linesCharts } from "@modules/charts/lib/chartFamilies/linesCharts";
import { treeCharts } from "@modules/charts/lib/chartFamilies/treeCharts";
import { treemapCharts } from "@modules/charts/lib/chartFamilies/treemapCharts";
import { sunburstCharts } from "@modules/charts/lib/chartFamilies/sunburstCharts";
import { parallelCharts } from "@modules/charts/lib/chartFamilies/parallelCharts";
import { sankeyCharts } from "@modules/charts/lib/chartFamilies/sankeyCharts";
import { funnelCharts } from "@modules/charts/lib/chartFamilies/funnelCharts";
import { gaugeCharts } from "@modules/charts/lib/chartFamilies/gaugeCharts";
import { pictorialBarCharts } from "@modules/charts/lib/chartFamilies/pictorialBarCharts";
import { themeRiverCharts } from "@modules/charts/lib/chartFamilies/themeRiverCharts";
import { calendarCharts } from "@modules/charts/lib/chartFamilies/calendarCharts";
import { matrixCharts } from "@modules/charts/lib/chartFamilies/matrixCharts";
import { chordCharts } from "@modules/charts/lib/chartFamilies/chordCharts";
import { mixedCharts } from "@modules/charts/lib/chartFamilies/mixedCharts";
import { customCharts } from "@modules/charts/lib/chartFamilies/customCharts";
import { datasetCharts } from "@modules/charts/lib/chartFamilies/datasetCharts";
import { dataZoomCharts } from "@modules/charts/lib/chartFamilies/dataZoomCharts";
import { graphicCharts } from "@modules/charts/lib/chartFamilies/graphicCharts";
import { richTextCharts } from "@modules/charts/lib/chartFamilies/richTextCharts";

export const CHART_SELECTOR_FAMILIES = [
  lineCharts,
  areaCharts,
  barCharts,
  mixedCharts,
  pieCharts,
  polarCharts,
  scatterCharts,
  bubbleCharts,
  mapCharts,
  candlestickCharts,
  radarCharts,
  boxplotCharts,
  heatmapCharts,
  graphCharts,
  linesCharts,
  treeCharts,
  treemapCharts,
  sunburstCharts,
  parallelCharts,
  sankeyCharts,
  funnelCharts,
  gaugeCharts,
  pictorialBarCharts,
  themeRiverCharts,
  calendarCharts,
  matrixCharts,
  chordCharts,
  customCharts,
  datasetCharts,
  dataZoomCharts,
  graphicCharts,
  richTextCharts,
];

export function getChartFamilyById(familyId) {
  return CHART_SELECTOR_FAMILIES.find((family) => family.id === familyId) ?? null;
}

export function getChartVariantById(variantId) {
  for (const family of CHART_SELECTOR_FAMILIES) {
    const variant = family.variants.find((item) => item.id === variantId);
    if (variant) return variant;
  }
  return null;
}
