import { normalizeChartConfig } from "./normalizeChartConfig";

function safeComponentName(value, fallback) {
  const cleaned = String(value ?? "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return cleaned || fallback;
}

function toCode(value, indent = 0) {
  const pad = "  ".repeat(indent);
  const nextPad = "  ".repeat(indent + 1);

  if (typeof value === "function") return value.toString();
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";

  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return `\n[${value.map((item) => `\n${nextPad}${toCode(item, indent + 1)}`).join(",")}\n${pad}]`.trimStart();
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (!entries.length) return "{}";

    return `\n{${entries
      .map(([key, item]) => `\n${nextPad}${key}: ${toCode(item, indent + 1)}`)
      .join(",")}\n${pad}}`.trimStart();
  }

  return "undefined";
}

function normalizeExportChart(widget = {}, preset = "exportStatic") {
  const title = widget.name ?? widget.title ?? widget.config?.title ?? widget.config?.name ?? "Chart";
  return normalizeChartConfig({
    ...(widget.config ?? {}),
    title,
    name: title,
    renderer: "chartjs",
    chartPreset: preset,
  });
}

function getExportRows(widget = {}, normalizedChart = {}) {
  if (Array.isArray(widget.data)) return widget.data;
  if (Array.isArray(normalizedChart.queryResult?.rows)) return normalizedChart.queryResult.rows;
  return [];
}

export function buildWidgetExportCode(widget) {
  const safeWidget = widget ?? {};
  const componentName = safeComponentName(safeWidget.name, "EmbeddedChart");
  const chart = normalizeExportChart(safeWidget, "exportStatic");
  const rows = getExportRows(safeWidget, chart);

  return [
    "import React from \"react\";",
    "import ChartRenderer from \"./components/charts/ChartRenderer\";",
    "",
    `const chart = ${toCode(chart)};`,
    `const rows = ${toCode(rows)};`,
    "",
    `export default function ${componentName}() {`,
    "  return (",
    "    <div style={{ width: \"100%\", minHeight: 320 }}>",
    "      <ChartRenderer chart={chart} data={rows} containerHeight={320} mode=\"readonly\" />",
    "    </div>",
    "  );",
    "}",
  ].join("\n");
}

export function buildDashboardExportCode(dashboardName, widgets) {
  const componentName = safeComponentName(dashboardName, "EmbeddedDashboard");
  const safeWidgets = Array.isArray(widgets) ? widgets.filter(Boolean) : [];
  const widgetBlocks = safeWidgets
    .map((widget, index) => {
      const chartName = `chart${index + 1}`;
      const rowsName = `rows${index + 1}`;
      const styleValue = {
        gridColumn: `${(widget.layout?.x ?? 0) + 1} / span ${widget.layout?.w ?? 4}`,
        gridRow: `${(widget.layout?.y ?? 0) + 1} / span ${widget.layout?.h ?? 4}`,
      };
      const chart = normalizeExportChart(widget, "exportStatic");
      const rows = getExportRows(widget, chart);

      return [
        `const ${chartName} = ${toCode(chart)};`,
        `const ${rowsName} = ${toCode(rows)};`,
        "",
        `const widget${index + 1} = {`,
        `  id: ${JSON.stringify(widget.id)},`,
        `  title: ${JSON.stringify(widget.name)},`,
        `  chart: ${chartName},`,
        `  rows: ${rowsName},`,
        `  style: ${toCode(styleValue, 1).replace(/^/gm, "  ")},`,
        "};",
      ].join("\n");
    })
    .join("\n\n");

  const widgetArray = `[${safeWidgets.map((_, index) => `widget${index + 1}`).join(", ")}]`;

  return [
    "import React from \"react\";",
    "import ChartRenderer from \"./components/charts/ChartRenderer\";",
    "",
    widgetBlocks,
    "",
    `const widgets = ${widgetArray};`,
    "",
    "const canvasStyle = {",
    "  display: \"grid\",",
    "  gridTemplateColumns: \"repeat(12, minmax(0, 1fr))\",",
    "  gridAutoRows: \"72px\",",
    "  gap: \"12px\",",
    "  width: \"100%\",",
    "};",
    "",
    "const panelStyle = {",
    "  border: \"1px solid #e5e7eb\",",
    "  background: \"#ffffff\",",
    "  padding: \"12px\",",
    "};",
    "",
    `export default function ${componentName}() {`,
    "  return (",
    "    <div style={canvasStyle}>",
    "      {widgets.map((widget) => (",
    "        <section key={widget.id} style={{ ...panelStyle, ...widget.style }}>",
    "          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{widget.title}</div>",
    "          <ChartRenderer chart={widget.chart} data={widget.rows} containerHeight={240} mode=\"readonly\" />",
    "        </section>",
    "      ))}",
    "    </div>",
    "  );",
    "}",
  ].join("\n");
}
