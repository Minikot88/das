import { lineCharts } from "@/utils/chartFamilies/lineCharts";
import { areaCharts } from "@/utils/chartFamilies/areaCharts";
import { barCharts } from "@/utils/chartFamilies/barCharts";
import { pieCharts } from "@/utils/chartFamilies/pieCharts";
import { scatterCharts } from "@/utils/chartFamilies/scatterCharts";
import { bubbleCharts } from "@/utils/chartFamilies/bubbleCharts";
import { mapCharts } from "@/utils/chartFamilies/mapCharts";
import { candlestickCharts } from "@/utils/chartFamilies/candlestickCharts";
import { radarCharts } from "@/utils/chartFamilies/radarCharts";
import { polarCharts } from "@/utils/chartFamilies/polarCharts";
import { boxplotCharts } from "@/utils/chartFamilies/boxplotCharts";
import { heatmapCharts } from "@/utils/chartFamilies/heatmapCharts";
import { graphCharts } from "@/utils/chartFamilies/graphCharts";
import { linesCharts } from "@/utils/chartFamilies/linesCharts";
import { treeCharts } from "@/utils/chartFamilies/treeCharts";
import { treemapCharts } from "@/utils/chartFamilies/treemapCharts";
import { sunburstCharts } from "@/utils/chartFamilies/sunburstCharts";
import { parallelCharts } from "@/utils/chartFamilies/parallelCharts";
import { sankeyCharts } from "@/utils/chartFamilies/sankeyCharts";
import { funnelCharts } from "@/utils/chartFamilies/funnelCharts";
import { gaugeCharts } from "@/utils/chartFamilies/gaugeCharts";
import { pictorialBarCharts } from "@/utils/chartFamilies/pictorialBarCharts";
import { themeRiverCharts } from "@/utils/chartFamilies/themeRiverCharts";
import { calendarCharts } from "@/utils/chartFamilies/calendarCharts";
import { matrixCharts } from "@/utils/chartFamilies/matrixCharts";
import { chordCharts } from "@/utils/chartFamilies/chordCharts";
import { mixedCharts } from "@/utils/chartFamilies/mixedCharts";
import { customCharts } from "@/utils/chartFamilies/customCharts";
import { datasetCharts } from "@/utils/chartFamilies/datasetCharts";
import { dataZoomCharts } from "@/utils/chartFamilies/dataZoomCharts";
import { graphicCharts } from "@/utils/chartFamilies/graphicCharts";
import { richTextCharts } from "@/utils/chartFamilies/richTextCharts";

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
