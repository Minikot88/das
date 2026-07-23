import { BarChart, BoxplotChart, CandlestickChart, CustomChart, FunnelChart, GaugeChart, GraphChart, HeatmapChart, LineChart, ParallelChart, PieChart, RadarChart, SankeyChart, ScatterChart, SunburstChart, TreemapChart } from "echarts/charts";
import { CalendarComponent, DataZoomComponent, DatasetComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent, TransformComponent, VisualMapComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  GaugeChart,
  FunnelChart,
  TreemapChart,
  HeatmapChart,
  SunburstChart,
  SankeyChart,
  CandlestickChart,
  BoxplotChart,
  GraphChart,
  ParallelChart,
  CustomChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  TitleComponent,
  DatasetComponent,
  TransformComponent,
  CalendarComponent,
  VisualMapComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export { echarts };
