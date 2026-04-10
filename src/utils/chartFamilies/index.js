import { lineCharts } from "./lineCharts";
import { barCharts } from "./barCharts";
import { pieCharts } from "./pieCharts";
import { scatterCharts } from "./scatterCharts";
import { mapCharts } from "./mapCharts";
import { candlestickCharts } from "./candlestickCharts";
import { radarCharts } from "./radarCharts";
import { boxplotCharts } from "./boxplotCharts";
import { heatmapCharts } from "./heatmapCharts";
import { graphCharts } from "./graphCharts";
import { linesCharts } from "./linesCharts";
import { treeCharts } from "./treeCharts";
import { treemapCharts } from "./treemapCharts";
import { sunburstCharts } from "./sunburstCharts";
import { parallelCharts } from "./parallelCharts";
import { sankeyCharts } from "./sankeyCharts";
import { funnelCharts } from "./funnelCharts";
import { gaugeCharts } from "./gaugeCharts";
import { pictorialBarCharts } from "./pictorialBarCharts";
import { themeRiverCharts } from "./themeRiverCharts";
import { calendarCharts } from "./calendarCharts";
import { matrixCharts } from "./matrixCharts";
import { chordCharts } from "./chordCharts";
import { customCharts } from "./customCharts";
import { datasetCharts } from "./datasetCharts";
import { dataZoomCharts } from "./dataZoomCharts";
import { graphicCharts } from "./graphicCharts";
import { richTextCharts } from "./richTextCharts";

export const CHART_SELECTOR_FAMILIES = [
  lineCharts,
  barCharts,
  pieCharts,
  scatterCharts,
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

