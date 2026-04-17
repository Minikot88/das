import React from "react";
import InspectorLayout from "../layout/InspectorLayout";
import BuilderMappingsSection from "./BuilderMappingsSection";
import BuilderVisualSection from "./BuilderVisualSection";
import BuilderLabelSection from "./BuilderLabelSection";
import DisplayOptionsSection from "./DisplayOptionsSection";
import SqlEditorPanel from "./SqlEditorPanel";

function ToggleControl({ label, hint, checked, onChange }) {
  return (
    <label className="builder-toggle-row">
      <span className="builder-toggle-copy">
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      <span className={`builder-toggle-pill${checked ? " is-on" : ""}`}>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className="builder-toggle-knob" aria-hidden="true" />
      </span>
    </label>
  );
}

function NumberControl({ label, value, onChange, min = 0, max = 100, step = 1, allowAuto = false }) {
  return (
    <label className="builder-form-field">
      <span className="builder-form-label">{label}</span>
      <input
        className="builder-form-input"
        type="number"
        value={allowAuto && value === "auto" ? "" : value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          if (allowAuto && event.target.value === "") {
            onChange("auto");
            return;
          }
          onChange(Number(event.target.value));
        }}
      />
    </label>
  );
}

function SelectControl({ label, value, onChange, options = [] }) {
  return (
    <label className="builder-form-field">
      <span className="builder-form-label">{label}</span>
      <select className="builder-form-input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeControl({ label, value, onChange, min = 0, max = 1, step = 0.05 }) {
  return (
    <label className="builder-form-field">
      <span className="builder-form-label">{label}</span>
      <input
        className="builder-form-input"
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function resolveSettingsFamilyKey(activeChartMeta, activeChartFamilyMeta) {
  const familyId = activeChartFamilyMeta?.id ?? activeChartMeta?.selectorFamilyId ?? activeChartMeta?.family ?? activeChartMeta?.renderType ?? activeChartMeta?.id;

  if (["line"].includes(familyId)) return "line";
  if (["bar"].includes(familyId)) return "bar";
  if (["pie", "richText"].includes(familyId)) return "pie";
  if (["scatter"].includes(familyId)) return "scatter";
  if (["gauge"].includes(familyId)) return "gauge";
  if (["heatmap", "matrix"].includes(familyId)) return "heatmap";
  if (["treemap"].includes(familyId)) return "treemap";
  if (["sunburst"].includes(familyId)) return "sunburst";
  if (["tree"].includes(familyId)) return "tree";
  if (["sankey"].includes(familyId)) return "sankey";
  if (["funnel"].includes(familyId)) return "funnel";
  if (["radar"].includes(familyId)) return "radar";
  if (["candlestick"].includes(familyId)) return "candlestick";
  if (["boxplot"].includes(familyId)) return "boxplot";
  if (["parallel"].includes(familyId)) return "parallel";
  if (["calendar"].includes(familyId)) return "calendar";
  if (["themeRiver"].includes(familyId) || activeChartMeta?.renderType === "theme-river") return "theme-river";
  return "fallback";
}

function getChartSettingsDefinition(activeChartMeta, activeChartFamilyMeta) {
  const familyKey = resolveSettingsFamilyKey(activeChartMeta, activeChartFamilyMeta);

  const definitions = {
    line: {
      summary: "Lines",
      controls: [
        { type: "toggle", key: "smooth", label: "Smooth" },
        { type: "toggle", key: "area", label: "Area fill" },
        { type: "toggle", key: "stack", label: "Stack series" },
        { type: "toggle", key: "step", label: "Step line" },
        { type: "toggle", key: "showSymbol", label: "Show symbols" },
        { type: "toggle", key: "connectNulls", label: "Connect nulls" },
        { type: "toggle", key: "showLabels", label: "Show labels", scope: "display" },
        { type: "number", key: "lineWidth", label: "Line width", min: 1, max: 8, step: 1 },
        { type: "range", key: "curveTension", label: "Curve amount", min: 0, max: 1, step: 0.05 },
      ],
    },
    bar: {
      summary: "Bars",
      controls: [
        { type: "toggle", key: "horizontal", label: "Horizontal" },
        { type: "toggle", key: "stack", label: "Stack series" },
        { type: "number", key: "borderRadius", label: "Border radius", min: 0, max: 18, step: 1 },
        { type: "number", key: "barWidth", label: "Bar width", min: 12, max: 64, step: 1 },
        { type: "toggle", key: "showLabels", label: "Show labels", scope: "display" },
        {
          type: "select",
          key: "sort",
          label: "Sort",
          options: [
            { value: "none", label: "None" },
            { value: "desc", label: "Highest first" },
            { value: "asc", label: "Lowest first" },
          ],
        },
        { type: "number", key: "groupGap", label: "Group gap", min: 0, max: 48, step: 2 },
        { type: "number", key: "barGap", label: "Bar gap", min: 0, max: 48, step: 2 },
      ],
    },
    pie: {
      summary: "Slices",
      controls: [
        { type: "toggle", key: "donut", label: "Donut mode" },
        { type: "toggle", key: "rose", label: "Rose mode" },
        { type: "number", key: "innerRadius", label: "Inner radius", min: 0, max: 80, step: 1 },
        { type: "number", key: "outerRadius", label: "Outer radius", min: 40, max: 90, step: 1 },
        {
          type: "select",
          key: "labelPosition",
          label: "Label position",
          options: [
            { value: "outside", label: "Outside" },
            { value: "inside", label: "Inside" },
            { value: "center", label: "Center" },
          ],
        },
        { type: "toggle", key: "showPercent", label: "Show percent" },
        {
          type: "select",
          key: "legendPosition",
          label: "Legend position",
          scope: "display",
          options: [
            { value: "bottom", label: "Bottom" },
            { value: "top", label: "Top" },
            { value: "right", label: "Right" },
          ],
        },
      ],
    },
    scatter: {
      summary: "Marks",
      controls: [
        { type: "number", key: "symbolSize", label: "Symbol size", min: 6, max: 48, step: 1 },
        { type: "toggle", key: "bubbleMode", label: "Bubble mode" },
        { type: "range", key: "opacity", label: "Opacity", min: 0.2, max: 1, step: 0.05 },
        { type: "toggle", key: "showLabels", label: "Show labels", scope: "display" },
        { type: "toggle", key: "regression", label: "Regression line" },
      ],
    },
    gauge: {
      summary: "Gauge",
      controls: [
        { type: "number", key: "min", label: "Min", min: -1000, max: 100000, step: 1 },
        { type: "number", key: "max", label: "Max", min: 1, max: 100000, step: 1 },
        { type: "toggle", key: "progress", label: "Progress" },
        { type: "number", key: "splitNumber", label: "Split number", min: 1, max: 12, step: 1 },
        { type: "number", key: "startAngle", label: "Start angle", min: -360, max: 360, step: 5 },
        { type: "number", key: "endAngle", label: "End angle", min: -360, max: 360, step: 5 },
        { type: "toggle", key: "showPointer", label: "Show pointer" },
        { type: "toggle", key: "showProgressRing", label: "Show progress ring" },
        {
          type: "select",
          key: "detailFormatter",
          label: "Detail format",
          options: [
            { value: "value", label: "Value" },
            { value: "percent", label: "Percent" },
            { value: "compact", label: "Compact" },
          ],
        },
      ],
    },
    heatmap: {
      summary: "Heatmap",
      controls: [
        { type: "toggle", key: "showLabels", label: "Show labels", scope: "display" },
        { type: "number", key: "cellGap", label: "Cell gap", min: 0, max: 12, step: 1 },
        { type: "number", key: "visualMin", label: "Visual min", min: 0, max: 100000, step: 1, allowAuto: true },
        { type: "number", key: "visualMax", label: "Visual max", min: 0, max: 100000, step: 1, allowAuto: true },
        {
          type: "select",
          key: "colorScaleMode",
          label: "Color scale",
          options: [
            { value: "sequential", label: "Sequential" },
            { value: "diverging", label: "Diverging" },
            { value: "categorical", label: "Categorical" },
          ],
        },
      ],
    },
    treemap: {
      summary: "Hierarchy",
      controls: [
        { type: "number", key: "leafDepth", label: "Leaf depth", min: 1, max: 6, step: 1 },
        { type: "toggle", key: "showParentLabels", label: "Parent labels" },
        { type: "toggle", key: "breadcrumb", label: "Breadcrumb" },
        { type: "number", key: "gapWidth", label: "Gap width", min: 0, max: 12, step: 1 },
      ],
    },
    sunburst: {
      summary: "Hierarchy",
      controls: [
        { type: "number", key: "radiusInner", label: "Inner radius", min: 0, max: 80, step: 1 },
        { type: "number", key: "radiusOuter", label: "Outer radius", min: 30, max: 90, step: 1 },
        {
          type: "select",
          key: "labelRotate",
          label: "Label rotate",
          options: [
            { value: "radial", label: "Radial" },
            { value: "tangential", label: "Tangential" },
            { value: "none", label: "None" },
          ],
        },
        {
          type: "select",
          key: "nodeClick",
          label: "Node click",
          options: [
            { value: "rootToNode", label: "Root to node" },
            { value: "link", label: "Link" },
            { value: "none", label: "None" },
          ],
        },
      ],
    },
    tree: {
      summary: "Hierarchy",
      controls: [
        {
          type: "select",
          key: "orientation",
          label: "Orientation",
          options: [
            { value: "LR", label: "Left to right" },
            { value: "RL", label: "Right to left" },
            { value: "TB", label: "Top to bottom" },
            { value: "BT", label: "Bottom to top" },
          ],
        },
        { type: "toggle", key: "radial", label: "Radial mode" },
        { type: "number", key: "expandDepth", label: "Expand depth", min: 1, max: 6, step: 1 },
        {
          type: "select",
          key: "edgeShape",
          label: "Edge shape",
          options: [
            { value: "curve", label: "Curve" },
            { value: "polyline", label: "Polyline" },
            { value: "straight", label: "Straight" },
          ],
        },
      ],
    },
    sankey: {
      summary: "Flow",
      controls: [
        {
          type: "select",
          key: "nodeAlign",
          label: "Node align",
          options: [
            { value: "justify", label: "Justify" },
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ],
        },
        { type: "number", key: "nodeWidth", label: "Node width", min: 8, max: 40, step: 1 },
        { type: "number", key: "nodeGap", label: "Node gap", min: 4, max: 36, step: 1 },
        { type: "range", key: "curveness", label: "Curveness", min: 0, max: 1, step: 0.05 },
      ],
    },
    funnel: {
      summary: "Funnel",
      controls: [
        {
          type: "select",
          key: "sortDirection",
          label: "Sort direction",
          options: [
            { value: "descending", label: "Descending" },
            { value: "ascending", label: "Ascending" },
          ],
        },
        { type: "number", key: "gap", label: "Gap", min: 0, max: 12, step: 1 },
        {
          type: "select",
          key: "labelPosition",
          label: "Label position",
          options: [
            { value: "inside", label: "Inside" },
            { value: "outside", label: "Outside" },
            { value: "left", label: "Left" },
          ],
        },
      ],
    },
    radar: {
      summary: "Radar",
      controls: [
        {
          type: "select",
          key: "shape",
          label: "Shape",
          options: [
            { value: "polygon", label: "Polygon" },
            { value: "circle", label: "Circle" },
          ],
        },
        { type: "number", key: "radius", label: "Radius", min: 30, max: 90, step: 1 },
        { type: "number", key: "splitNumber", label: "Split number", min: 2, max: 8, step: 1 },
        { type: "toggle", key: "areaFill", label: "Area fill" },
      ],
    },
    candlestick: {
      summary: "Market",
      controls: [
        { type: "toggle", key: "showDataZoom", label: "Show data zoom" },
        {
          type: "select",
          key: "bullMode",
          label: "Bull style",
          options: [
            { value: "default", label: "Default" },
            { value: "solid", label: "Solid" },
            { value: "outline", label: "Outline" },
          ],
        },
        {
          type: "select",
          key: "bearMode",
          label: "Bear style",
          options: [
            { value: "default", label: "Default" },
            { value: "solid", label: "Solid" },
            { value: "outline", label: "Outline" },
          ],
        },
      ],
    },
    boxplot: {
      summary: "Distribution",
      controls: [
        { type: "toggle", key: "showOutliers", label: "Show outliers" },
        { type: "number", key: "boxWidth", label: "Box width", min: 20, max: 80, step: 2 },
      ],
    },
    parallel: {
      summary: "Parallel",
      controls: [
        { type: "toggle", key: "axisExpand", label: "Axis expand" },
        { type: "range", key: "lineOpacity", label: "Line opacity", min: 0.1, max: 1, step: 0.05 },
        { type: "toggle", key: "smooth", label: "Smooth lines" },
      ],
    },
    calendar: {
      summary: "Calendar",
      controls: [
        { type: "number", key: "cellSize", label: "Cell size", min: 12, max: 36, step: 1 },
        {
          type: "select",
          key: "layout",
          label: "Layout",
          options: [
            { value: "horizontal", label: "Horizontal" },
            { value: "vertical", label: "Vertical" },
          ],
        },
        {
          type: "select",
          key: "rangeMode",
          label: "Range",
          options: [
            { value: "auto", label: "Auto" },
            { value: "month", label: "Month" },
            { value: "year", label: "Year" },
          ],
        },
      ],
    },
    "theme-river": {
      summary: "Stream",
      controls: [
        { type: "toggle", key: "boundaryGap", label: "Boundary gap" },
        { type: "toggle", key: "showSeriesLabels", label: "Show labels" },
      ],
    },
    fallback: {
      summary: "Inspector",
      controls: [
        { type: "toggle", key: "showLabels", label: "Show labels", scope: "display" },
        { type: "toggle", key: "showLegend", label: "Show legend", scope: "display" },
      ],
      helper: "Shared controls are available for this chart.",
    },
  };

  return {
    familyKey,
    ...(definitions[familyKey] ?? definitions.fallback),
  };
}

function renderSettingControl(control, chartSettings, displayOptions, onChartSettingChange, onDisplayChange) {
  const value = control.scope === "display" ? displayOptions[control.key] : chartSettings[control.key];
  const handleChange = control.scope === "display"
    ? (nextValue) => onDisplayChange(control.key, nextValue)
    : (nextValue) => onChartSettingChange(control.key, nextValue);

  if (control.type === "toggle") {
    return (
      <ToggleControl
        key={`${control.scope ?? "settings"}-${control.key}`}
        label={control.label}
        hint={control.hint}
        checked={Boolean(value)}
        onChange={handleChange}
      />
    );
  }

  if (control.type === "select") {
    return (
      <SelectControl
        key={`${control.scope ?? "settings"}-${control.key}`}
        label={control.label}
        value={value}
        onChange={handleChange}
        options={control.options}
      />
    );
  }

  if (control.type === "range") {
    return (
      <RangeControl
        key={`${control.scope ?? "settings"}-${control.key}`}
        label={control.label}
        value={value}
        onChange={handleChange}
        min={control.min}
        max={control.max}
        step={control.step}
      />
    );
  }

  return (
    <NumberControl
      key={`${control.scope ?? "settings"}-${control.key}`}
      label={control.label}
      value={value}
      onChange={handleChange}
      min={control.min}
      max={control.max}
      step={control.step}
      allowAuto={control.allowAuto}
    />
  );
}

export default function BuilderConfigPane({
  chartDefinition,
  chartType,
  activeChartMeta,
  activeChartFamilyMeta,
  activeChartVariantMeta,
  chartCatalog,
  chartSelectorFamilies,
  chartSelectorCategories,
  visibleChartFamilies,
  visibleChartVariants,
  selectedChartCategory,
  selectedChartFamily,
  selectedChartVariant,
  recommendedCharts,
  onChartTypeChange,
  onChartCategoryChange,
  onChartFamilyChange,
  onChartVariantChange,
  validationSummary,
  aggregation,
  aggregationOptions,
  queryMode,
  generatedSql,
  customSql,
  queryResult,
  queryError,
  queryStatus,
  lastRunAt,
  previewState,
  chartSettings,
  displayOptions,
  labelSettings,
  onChartSettingChange,
  onDisplayChange,
  onLabelChange,
  onAggregationChange,
  roleAssignments,
  roleValidation,
  handleFieldAssign,
  clearSlot,
  handleRoleFieldRemove,
  handleReorderRole,
  lastMappingNotice,
  canAssignFieldToRole,
  handleQueryModeChange,
  handleSqlChange,
  handleRunSql,
  handleFormatSql,
  handleResetSql,
  handleUseSqlResultForChart,
}) {
  const blockerCount = validationSummary?.blockers?.length ?? 0;
  const previewStatus = previewState?.status ?? "idle";
  const previewIssue = previewState?.error ?? "";
  const inlineIssue = queryError || previewIssue || validationSummary?.blockers?.[0]?.title || "";
  const optionalRoleAssignments = roleAssignments.filter((role) => !role.required);
  const roleValidationItems = Array.isArray(roleValidation)
    ? roleValidation
    : [
        ...(roleValidation?.blockers ?? []),
        ...(roleValidation?.cautions ?? []),
      ];
  const requiredIssues = roleValidationItems.filter((issue) => issue?.severity !== "caution" && issue?.level !== "warning");
  const chartSettingsDefinition = getChartSettingsDefinition(activeChartMeta, activeChartFamilyMeta);
  const settingsReady = blockerCount === 0 && previewStatus === "success";

  return (
    <InspectorLayout
      className="builder-pane-shell builder-pane-shell-right"
      style={{
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <section
        className="builder-controls-panel ui-panel"
        style={{
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          className="builder-controls-overview"
          style={{
            flexShrink: 0,
            paddingBottom: 6,
          }}
        >
          <div>
            <h2 className="builder-pane-title">Settings</h2>
          </div>
          <span className={`builder-status-badge${settingsReady ? " ready" : " is-alert"}`}>
            {settingsReady ? "Preview ready" : blockerCount ? `${blockerCount} issues` : "Preview pending"}
          </span>
        </div>

        {inlineIssue ? (
          <div
            className="builder-inline-validation"
            style={{
              flexShrink: 0,
              padding: 8,
            }}
          >
            {inlineIssue}
          </div>
        ) : null}

        <div
          className="builder-controls-grid"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: 2,
            gap: 6,
            alignContent: "start",
          }}
        >
          <div className="builder-controls-card builder-inspector-card" style={{ gap: 6 }}>
            <BuilderVisualSection
              chartDefinition={chartDefinition}
              chartType={chartType}
              activeChartMeta={activeChartMeta}
              activeChartFamilyMeta={activeChartFamilyMeta}
              activeChartVariantMeta={activeChartVariantMeta}
              chartCatalog={chartCatalog}
              chartSelectorFamilies={chartSelectorFamilies}
              chartSelectorCategories={chartSelectorCategories}
              visibleChartFamilies={visibleChartFamilies}
              visibleChartVariants={visibleChartVariants}
              selectedChartCategory={selectedChartCategory}
              selectedChartFamily={selectedChartFamily}
              selectedChartVariant={selectedChartVariant}
              recommendedCharts={recommendedCharts}
              onChartTypeChange={onChartTypeChange}
              onChartCategoryChange={onChartCategoryChange}
              onChartFamilyChange={onChartFamilyChange}
              onChartVariantChange={onChartVariantChange}
            />
          </div>

          <div className="builder-controls-card builder-inspector-card" style={{ gap: 5 }}>
            <details className="builder-inspector-collapsible" open>
              <summary className="builder-inspector-collapsible-summary" style={{ padding: "7px 8px" }}>
                <span>Chart</span>
                <strong>{chartSettingsDefinition.summary}</strong>
              </summary>
              <div className="builder-config-stack builder-chart-settings-stack" style={{ gap: 6 }}>
                {aggregationOptions.length ? (
                  <div className="builder-aggregation-toggle compact" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {aggregationOptions.map((agg) => (
                      <button
                        key={agg}
                        type="button"
                        onClick={() => onAggregationChange(agg)}
                        className={`builder-aggregation-btn${aggregation === agg ? " active" : ""}`}
                      >
                        {agg}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="builder-chart-settings-grid">
                  {chartSettingsDefinition.controls.map((control) =>
                    renderSettingControl(control, chartSettings, displayOptions, onChartSettingChange, onDisplayChange)
                  )}
                </div>
                {chartSettingsDefinition.helper ? (
                  <div className="builder-settings-helper">{chartSettingsDefinition.helper}</div>
                ) : null}
              </div>
            </details>
          </div>

          <div className="builder-controls-card builder-inspector-card" style={{ gap: 5 }}>
            <details className="builder-inspector-collapsible" open>
              <summary className="builder-inspector-collapsible-summary" style={{ padding: "7px 8px" }}>
                <span>Labels</span>
                <strong>Text</strong>
              </summary>
              <BuilderLabelSection
                chartMeta={activeChartMeta}
                labelSettings={labelSettings}
                onLabelChange={onLabelChange}
              />
            </details>

            <details className="builder-inspector-collapsible">
              <summary className="builder-inspector-collapsible-summary" style={{ padding: "7px 8px" }}>
                <span>Display</span>
                <strong>Global</strong>
              </summary>
              <DisplayOptionsSection
                displayOptions={displayOptions}
                onDisplayChange={onDisplayChange}
              />
            </details>

            {optionalRoleAssignments.length ? (
              <details className="builder-inspector-collapsible">
                <summary className="builder-inspector-collapsible-summary" style={{ padding: "7px 8px" }}>
                  <span>Mappings</span>
                  <strong>{optionalRoleAssignments.length}</strong>
                </summary>
                <BuilderMappingsSection
                  roleAssignments={optionalRoleAssignments}
                  lastMappingNotice=""
                  handleFieldAssign={handleFieldAssign}
                  handleRoleFieldRemove={handleRoleFieldRemove}
                  handleClearRole={clearSlot}
                  handleReorderRole={handleReorderRole}
                  canAssignFieldToRole={canAssignFieldToRole}
                />
              </details>
            ) : null}

            <details className="builder-inspector-collapsible" open={queryMode === "sql"}>
              <summary className="builder-inspector-collapsible-summary" style={{ padding: "7px 8px" }}>
                <span>Query</span>
                <strong>{queryMode === "sql" ? "SQL" : "Visual"}</strong>
              </summary>
              <SqlEditorPanel
                queryMode={queryMode}
                generatedSql={generatedSql}
                customSql={customSql}
                queryResult={queryResult}
                queryError={queryError}
                queryStatus={queryStatus}
                lastRunAt={lastRunAt}
                onModeChange={handleQueryModeChange}
                onSqlChange={handleSqlChange}
                onRunSql={handleRunSql}
                onFormatSql={handleFormatSql}
                onResetSql={handleResetSql}
                onUseResult={handleUseSqlResultForChart}
              />
            </details>

            {requiredIssues?.length ? (
              <div className="builder-validation-inline-list">
                {requiredIssues.slice(0, 2).map((issue) => (
                  <div key={issue.code ?? issue.title} className="builder-validation-inline-item">{issue.title}</div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </InspectorLayout>
  );
}
