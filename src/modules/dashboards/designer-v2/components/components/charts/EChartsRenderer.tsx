import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EChartsType } from "echarts/core";
import InsertChartOutlinedRoundedIcon from "@mui/icons-material/InsertChartOutlinedRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import type { DemoDatasetRow } from "@modules/dashboards/designer-v2/components/services/datasetService";
import { dashboardV2Tokens as tokens } from "@modules/dashboards/designer-v2/components/theme";
import type { Aggregation, ChartSettings, ChartType, DataField, DeviceMode, FilterValue, MappingSlot, TransformedChartData } from "@modules/dashboards/designer-v2/components/types";
import { toText } from "@modules/dashboards/designer-v2/components/utils/chartAggregations";
import { formatValue, transformChartData } from "@modules/dashboards/designer-v2/components/utils/chartDataEngine";
import { clearLatestEChartsInstance, setLatestEChartsInstance } from "@modules/dashboards/designer-v2/components/utils/echartsInstanceRegistry";
import { buildEChartsOption } from "@modules/dashboards/designer-v2/components/utils/echartsOptionBuilder";
import { echarts } from "@modules/dashboards/designer-v2/components/utils/echartsModules";
import { validateChartConfig } from "@modules/dashboards/designer-v2/components/utils/chartValidation";

type BuiltEChartsOption = ReturnType<typeof buildEChartsOption>;

type SortDirection = "asc" | "desc";
type ChartDensity = "standard" | "compact" | "mini";

type EChartsRendererProps = {
  chartType: ChartType | null;
  datasetRows: DemoDatasetRow[];
  allFields: DataField[];
  fieldMappings: MappingSlot[];
  chartSettings: ChartSettings;
  filters: Record<string, FilterValue>;
  aggregationSettings?: Record<string, Aggregation>;
  sort: "none" | "ascending" | "descending" | "byValueAscending" | "byValueDescending" | "monthOrder" | "dateOrder";
  textElements: string[];
  imageName: string | null;
  previewMode: boolean;
  deviceMode: DeviceMode;
  zoom: number;
  density?: ChartDensity;
};

function mapOptionEntries<T>(value: T, transform: (entry: Record<string, unknown>) => Record<string, unknown>): T {
  if (Array.isArray(value)) {
    return value.map((entry) => transform((entry ?? {}) as Record<string, unknown>)) as T;
  }
  if (value && typeof value === "object") {
    return transform(value as Record<string, unknown>) as T;
  }
  return value;
}

function applyChartDensity(option: BuiltEChartsOption, density: ChartDensity): BuiltEChartsOption {
  if (density === "standard") return option;

  const series = Array.isArray(option.series)
    ? option.series.map((entry) => {
        const item = (entry ?? {}) as Record<string, unknown>;
        const label = item.label && typeof item.label === "object" ? item.label as Record<string, unknown> : {};
        const labelLine = item.labelLine && typeof item.labelLine === "object" ? item.labelLine as Record<string, unknown> : {};
        return {
          ...item,
          label: { ...label, show: false },
          labelLine: { ...labelLine, show: false },
        };
      })
    : option.series;

  const compactOption: BuiltEChartsOption = {
    ...option,
    title: undefined,
    legend: mapOptionEntries(option.legend, (entry) => ({ ...entry, show: false })),
    series,
  };

  if (density !== "mini") return compactOption;

  return {
    ...compactOption,
    xAxis: mapOptionEntries(option.xAxis, (entry) => ({ ...entry, show: false })),
    yAxis: mapOptionEntries(option.yAxis, (entry) => ({ ...entry, show: false })),
    grid: mapOptionEntries(option.grid, (entry) => ({
      ...entry,
      top: 6,
      right: 6,
      bottom: 6,
      left: 6,
      containLabel: false,
      outerBoundsMode: undefined,
      outerBoundsContain: undefined,
    })),
    visualMap: mapOptionEntries(option.visualMap, (entry) => ({ ...entry, show: false })),
    dataZoom: mapOptionEntries(option.dataZoom, (entry) => ({ ...entry, show: false })),
  };
}

function EmptyState({ title, message, requirements }: { title: string; message: string; requirements: string[] }) {
  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 180,
        display: "grid",
        placeItems: "center",
        color: "text.secondary",
        border: "1px dashed",
        borderColor: tokens.color.borderStrong,
        bgcolor: tokens.color.surfaceMuted,
      }}
    >
      <Stack spacing={1} alignItems="center" sx={{ maxWidth: 420, textAlign: "center", px: 3 }}>
        <InsertChartOutlinedRoundedIcon sx={{ fontSize: 28, color: tokens.color.primary }} />
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: "text.primary" }}>{title}</Typography>
        <Typography sx={{ fontSize: 12, lineHeight: 1.7 }}>{message}</Typography>
        {requirements.length ? (
          <Stack spacing={0.5} sx={{ textAlign: "left", color: "text.secondary", fontSize: 12 }}>
            {requirements.map((item) => (
              <Typography key={item} component="span" sx={{ fontSize: 11 }}>
                - {item}
              </Typography>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Box sx={{ height: "100%", display: "grid", placeItems: "center", bgcolor: "#FFF7ED", border: "1px solid #FED7AA" }}>
      <Stack spacing={1} alignItems="center" sx={{ px: 3, textAlign: "center" }}>
        <WarningAmberRoundedIcon sx={{ color: "#EA580C" }} />
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: "#9A3412" }}>สร้างกราฟไม่สำเร็จ</Typography>
        <Typography sx={{ fontSize: 12, color: "#9A3412" }}>{message}</Typography>
      </Stack>
    </Box>
  );
}

function KpiPreview({ data, settings }: { data: TransformedChartData; settings: ChartSettings }) {
  const trendPositive = data.kpiTrend >= 0;
  return (
    <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
      <Paper
        elevation={0}
        sx={{
          minWidth: 260,
          border: "1px solid",
          borderColor: tokens.color.border,
          borderRadius: `${tokens.radius.card}px`,
          p: 2.5,
          bgcolor: settings.general.backgroundColor,
        }}
      >
        <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}>{data.kpiLabel}</Typography>
        <Typography sx={{ fontSize: 32, fontWeight: 500, color: "text.primary", letterSpacing: 0 }}>
          {formatValue(data.kpiValue, settings.axis.numberFormat)}
        </Typography>
        <Typography sx={{ mt: 1, fontSize: 12, color: trendPositive ? tokens.color.success : tokens.color.danger }}>
          {trendPositive ? "+" : ""}
          {data.kpiTrend.toFixed(1)}% เทียบกับช่วงก่อนหน้า
        </Typography>
      </Paper>
    </Box>
  );
}

function TablePreview({ data, pivot = false }: { data: TransformedChartData; pivot?: boolean }) {
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  const columns = useMemo(() => {
    if (!pivot) return data.tableColumns;
    return [
      { id: "name", name: data.xField?.name ?? "รายการ", label: data.xField?.name ?? "รายการ", type: "text", semanticType: "category", table: "", description: "", sampleValues: [], isMeasure: false, isDimension: true, defaultAggregation: "None" },
      ...data.seriesKeys.map((key) => ({
        id: key,
        name: data.seriesLabels[key] ?? key,
        label: data.seriesLabels[key] ?? key,
        type: "number" as const,
        semanticType: "currency" as const,
        table: "",
        description: "",
        sampleValues: [],
        isMeasure: true,
        isDimension: false,
        defaultAggregation: "Sum" as const,
      })),
    ] satisfies DataField[];
  }, [data, pivot]);

  const rows = useMemo(() => {
    const sourceRows = pivot ? data.rows : data.tableRows;
    const sortable = [...sourceRows];
    if (sortField) {
      sortable.sort((a, b) => {
        const left = a[sortField];
        const right = b[sortField];
        const numericLeft = Number(left);
        const numericRight = Number(right);
        const result = Number.isFinite(numericLeft) && Number.isFinite(numericRight)
          ? numericLeft - numericRight
          : toText(left).localeCompare(toText(right), "th", { numeric: true });
        return sortDirection === "asc" ? result : -result;
      });
    }
    return sortable;
  }, [data.rows, data.tableRows, pivot, sortDirection, sortField]);

  const visibleRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function sortBy(fieldId: string) {
    setSortDirection((current) => (sortField === fieldId && current === "asc" ? "desc" : "asc"));
    setSortField(fieldId);
    setPage(0);
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={{ height: "100%", border: "1px solid", borderColor: tokens.color.border, borderRadius: 0 }}>
      <Table stickyHeader size="small" aria-label={pivot ? "pivot table preview" : "table preview"}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.id} sx={{ bgcolor: "#F8FAFC", fontSize: 11, fontWeight: 500, borderColor: tokens.color.border }}>
                <TableSortLabel active={sortField === column.id} direction={sortField === column.id ? sortDirection : "asc"} onClick={() => sortBy(column.id)}>
                  {column.name}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleRows.map((row, index) => (
            <TableRow key={`${row.name ?? index}-${index}`} hover>
              {columns.map((column) => (
                <TableCell key={column.id} sx={{ fontSize: 11, borderColor: tokens.color.border }}>
                  {typeof row[column.id] === "number" ? formatValue(Number(row[column.id])) : String(row[column.id] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              count={rows.length}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[8, 12, 24]}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              colSpan={columns.length}
              labelRowsPerPage="แถว"
            />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
}

function EChartsCanvas({ option, zoom }: { option: BuiltEChartsOption; zoom: number }) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const mountedRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);

  const cancelResizeFrame = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const getLiveChart = useCallback(() => {
    const chart = chartRef.current;
    if (!mountedRef.current || !chart || chart.isDisposed()) return null;
    return chart;
  }, []);

  const scheduleResize = useCallback(() => {
    cancelResizeFrame();
    if (!mountedRef.current) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const chart = getLiveChart();
      if (!chart) return;
      chart.resize();
      setLatestEChartsInstance(chart);
    });
  }, [cancelResizeFrame, getLiveChart]);

  useEffect(() => {
    mountedRef.current = true;
    const element = elementRef.current;
    if (!element) {
      return () => {
        mountedRef.current = false;
      };
    }

    const renderPixelRatio = Math.min(
      4,
      Math.max(window.devicePixelRatio || 1, 2) * Math.max(1, zoom / 100)
    );
    const chart = echarts.init(element, undefined, {
      renderer: "canvas",
      // Dashboard zoom is a CSS transform. Render at the final visual scale so
      // chart strokes and text remain crisp at fractional and enlarged zooms.
      devicePixelRatio: renderPixelRatio,
    });
    chartRef.current = chart;
    setLatestEChartsInstance(chart);

    const markReady = () => {
      if (mountedRef.current && chartRef.current === chart && !chart.isDisposed()) {
        setLatestEChartsInstance(chart);
      }
    };

    chart.on("finished", markReady);
    window.addEventListener("resize", scheduleResize);

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => scheduleResize());
      observer.observe(element);
      resizeObserverRef.current = observer;
    }

    scheduleResize();

    return () => {
      mountedRef.current = false;
      cancelResizeFrame();
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chart.off("finished", markReady);
      window.removeEventListener("resize", scheduleResize);
      if (!chart.isDisposed()) {
        chart.dispose();
      }
      if (chartRef.current === chart) {
        chartRef.current = null;
      }
      clearLatestEChartsInstance(chart);
    };
  }, [cancelResizeFrame, scheduleResize, zoom]);

  useEffect(() => {
    const chart = getLiveChart();
    if (!chart) return undefined;
    chart.setOption(option, { notMerge: true, lazyUpdate: true });
    setLatestEChartsInstance(chart);
    scheduleResize();
    return undefined;
  }, [getLiveChart, option, scheduleResize]);

  return <Box ref={elementRef} className="dashboard-v2-echarts" sx={{ height: "100%", minHeight: 0, width: "100%" }} />;
}

export function AccessibleChartTable({ data, title }: { data: TransformedChartData; title: string }) {
  const columns = data.tableColumns.slice(0, 12);
  const rows = (data.tableRows.length ? data.tableRows : data.filteredRows).slice(0, 20);
  if (!columns.length) return null;
  return (
    <div className="sr-only">
      <table>
        <caption>{`Data preview for ${title}`}</caption>
        <thead>
          <tr>{columns.map((column) => <th key={column.id} scope="col">{column.label || column.name}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => <td key={column.id}>{String(row[column.id] ?? row[column.name] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? (
        <p role="status">{`ไม่มีแถวข้อมูลที่ตรงกับตัวกรองสำหรับ ${title}`}</p>
      ) : data.metadata.filteredRowCount > 20 ? (
        <p>{`Showing the first 20 of ${data.metadata.filteredRowCount} rows.`}</p>
      ) : null}
    </div>
  );
}

function EChartsRenderer({
  chartType,
  datasetRows,
  allFields,
  fieldMappings,
  chartSettings,
  filters,
  sort,
  textElements,
  imageName,
  previewMode,
  deviceMode,
  zoom,
  density = "standard",
}: EChartsRendererProps) {
  const config = useMemo(
    () => ({
      schemaVersion: 3,
      dashboardId: "dashboard-v2-local",
      chartId: "chart-v2-main",
      chartType,
      mappings: fieldMappings,
      settings: chartSettings,
      filters,
      sort,
      textElements,
      imageName,
      sourceType: "demo" as const,
      datasetId: "sales_performance",
      version: 3,
      createdAt: "",
      updatedAt: "",
    }),
    [chartSettings, chartType, fieldMappings, filters, imageName, sort, textElements]
  );

  const validation = useMemo(() => validateChartConfig(config), [config]);
  const transformedData = useMemo(() => transformChartData(datasetRows, config, allFields), [allFields, config, datasetRows]);
  const optionResult = useMemo(() => {
    try {
      return {
        option: applyChartDensity(
          buildEChartsOption({
            chartType,
            transformedData,
            fieldMappings,
            chartSettings,
            validationResult: validation,
          }),
          density
        ),
        error: "",
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[DashboardDesignerV2] ECharts option build failed", error);
      }
      return { option: null, error: error instanceof Error ? error.message : "ไม่สามารถสร้าง option ของ ECharts ได้" };
    }
  }, [chartSettings, chartType, density, fieldMappings, transformedData, validation]);

  useEffect(() => {
    if (chartType === "table" || chartType === "pivot-table" || chartType === "kpi-card" || chartType === "metric-card" || chartType === "scorecard") {
      clearLatestEChartsInstance();
    }
  }, [chartType]);

  if (!datasetRows.length) {
    return <EmptyState title="ไม่พบข้อมูล" message="ชุดข้อมูลไม่มีแถวให้สร้างกราฟ" requirements={["รีเฟรชข้อมูลหรือนำเข้าข้อมูลใหม่"]} />;
  }

  if (!validation.valid) {
    return <EmptyState title={validation.title} message={validation.message} requirements={validation.requirements} />;
  }

  if (optionResult.error || !optionResult.option) {
    return <ErrorState message={optionResult.error} />;
  }

  if (chartType === "table" || chartType === "summary-table" || chartType === "matrix-table") {
    return <TablePreview data={transformedData} />;
  }

  if (chartType === "pivot-table") {
    return <TablePreview data={transformedData} pivot />;
  }

  if (chartType === "kpi-card" || chartType === "metric-card" || chartType === "scorecard") {
    return <KpiPreview data={transformedData} settings={chartSettings} />;
  }

  return (
    <Box
      data-chart-type={chartType ?? ""}
      data-preview-mode={previewMode ? "true" : "false"}
      data-device-mode={deviceMode}
      data-zoom={zoom}
      sx={{ height: "100%", minHeight: 0 }}
    >
      <EChartsCanvas option={optionResult.option} zoom={zoom} />
      <AccessibleChartTable
        data={transformedData}
        title={chartSettings.general.title || "Chart preview"}
      />
    </Box>
  );
}

export default memo(EChartsRenderer);
