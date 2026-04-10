import React from "react";
import ChartRenderer from "../charts/ChartRenderer";
import { getReadableFieldLabel } from "../../utils/builderMappingUtils";
import BuilderQuerySection from "./BuilderQuerySection";

function MappingRoleChip({ role }) {
  const fields = role.fields ?? [];
  const fieldLabels = fields.map((field) => getReadableFieldLabel(field)).filter(Boolean);
  const isMapped = fields.length > 0;
  const isRequired = role.required;
  const tone = isMapped ? "#0f766e" : isRequired ? "#b45309" : "#64748b";
  const border = isMapped
    ? "color-mix(in srgb, var(--success) 28%, transparent)"
    : isRequired
      ? "color-mix(in srgb, var(--warning) 24%, transparent)"
      : "var(--border)";
  const background = isMapped
    ? "var(--success-soft)"
    : isRequired
      ? "var(--warning-soft)"
      : "var(--surface-secondary)";

  return (
    <div
      style={{
        display: "grid",
        gap: 4,
        minWidth: 0,
        minHeight: 58,
        alignContent: "start",
        padding: "8px 9px",
        border: `1px solid ${border}`,
        borderRadius: 5,
        background,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <strong style={{ fontSize: 12, color: "var(--text-primary)" }}>{role.label}</strong>
        <span
          style={{
            color: tone,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {isMapped ? "Mapped" : isRequired ? "Required" : "Optional"}
        </span>
      </div>
      <span style={{ fontSize: 10, color: isMapped ? "var(--text-primary)" : "var(--text-secondary)" }}>
        {isMapped ? fieldLabels.join(", ") : (role.helper || `Add ${role.label.toLowerCase()}`)}
      </span>
    </div>
  );
}

export default function BuilderPreviewPane({
  title,
  name,
  chartDefinition,
  activeChartLabel,
  activeChartMeta,
  selectedTable,
  previewChart,
  previewData,
  queryPreview,
  aggregation,
  slotAssignments,
  roleAssignments,
  validationSummary,
  previewSupported,
  previewState,
  completedRequiredRoleCount,
  requiredRoleCount,
}) {
  const blockerCount = validationSummary?.blockers?.length ?? 0;
  const hasPreviewData = Array.isArray(previewData) && previewData.length > 0;
  const previewRowCount = Array.isArray(previewData) ? previewData.length : 0;
  const previewStatusState = previewState?.status ?? "idle";
  const previewError = previewState?.error ?? "";
  const isPreviewLoading = previewStatusState === "loading";
  const hasPreviewError = previewStatusState === "error" && Boolean(previewError);
  const previewKey = previewChart?.config
    ? JSON.stringify({
        chartType: previewChart.config.chartType,
        x: previewChart.config.x,
        y: previewChart.config.y,
        groupBy: previewChart.config.groupBy,
        sizeField: previewChart.config.sizeField,
        aggregation,
      })
    : "empty";

  let emptyMessage = "Preview unavailable.";
  if (blockerCount) {
    emptyMessage = validationSummary?.blockers?.[0]?.title ?? "Map required fields.";
  } else if (hasPreviewError) {
    emptyMessage = previewError;
  } else if (!selectedTable) {
    emptyMessage = "Select a table.";
  } else if (isPreviewLoading) {
    emptyMessage = "Preparing preview.";
  } else if (!hasPreviewData) {
    emptyMessage = "No data.";
  }

  const requiredRoles = (roleAssignments ?? []).filter((role) => role.required);
  const optionalRoles = (roleAssignments ?? []).filter((role) => !role.required && role.fields?.length);
  const mappingHeadline = blockerCount
    ? validationSummary?.blockers?.[0]?.title ?? "Mapping required"
    : requiredRoleCount
      ? `${completedRequiredRoleCount}/${requiredRoleCount} required mappings ready`
      : "Preview ready";
  const previewStatus = previewSupported === false
    ? "Unavailable"
    : blockerCount
      ? "Needs mapping"
      : hasPreviewError
        ? "Query error"
        : isPreviewLoading
          ? "Loading"
      : hasPreviewData
        ? "Live preview"
        : previewChart
          ? "Ready"
          : "Waiting";

  return (
    <main className="builder-pane-shell builder-pane-shell-center">
      <section
        className="builder-preview-panel builder-preview-panel-compact"
        style={{
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "grid", gap: 8, flexShrink: 0 }}>
          <div
            className="builder-pane-header builder-pane-header-compact"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div className="builder-pane-header-copy" style={{ gap: 8, flexWrap: "wrap" }}>
              <h2 className="builder-pane-title">Preview</h2>
              {title || name ? <span className="builder-preview-chip">{title || name}</span> : null}
              {selectedTable ? <span className="builder-preview-chip is-soft">{selectedTable}</span> : null}
            </div>
            <div className="builder-preview-stage-status">
              <span className="builder-preview-chip">{previewStatus}</span>
            </div>
          </div>

          <div
            className="builder-preview-summary-strip"
            style={{
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            }}
          >
            <div style={{ padding: 8 }}>
              <span className="builder-query-label">Chart</span>
              <strong>{activeChartLabel ?? "Chart"}</strong>
            </div>
            <div style={{ padding: 8 }}>
              <span className="builder-query-label">Metric</span>
              <strong>{aggregation || "sum"}</strong>
            </div>
            <div style={{ padding: 8 }}>
              <span className="builder-query-label">Source</span>
              <strong>{selectedTable ?? "No table"}</strong>
            </div>
          </div>

          <section
            style={{
              display: "grid",
              gap: 6,
              padding: 8,
              border: "1px solid var(--border)",
              borderRadius: 5,
              background: "var(--surface)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 2 }}>
                <span className="builder-query-label">Mappings</span>
                <strong style={{ fontSize: 12 }}>{activeChartLabel ?? "Chart"}</strong>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 20,
                  padding: "0 7px",
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  background: blockerCount ? "var(--warning-soft)" : "var(--success-soft)",
                  color: blockerCount ? "var(--warning)" : "var(--success)",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {mappingHeadline}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
                gap: 6,
                alignItems: "stretch",
              }}
            >
              {requiredRoles.map((role) => <MappingRoleChip key={role.key} role={role} />)}
            </div>

            {optionalRoles.length ? (
              <div style={{ display: "grid", gap: 4 }}>
                <span className="builder-query-label" style={{ fontSize: 10 }}>Optional</span>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    alignItems: "stretch",
                  }}
                >
                  {optionalRoles.map((role) => (
                    <div key={role.key} style={{ minWidth: 148, flex: "1 1 148px" }}>
                      <MappingRoleChip role={role} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
            }}
          >
            {previewSupported === false ? (
              <div
                className="builder-preview-stage builder-preview-inline-empty"
                style={{
                  width: "100%",
                  minHeight: 260,
                }}
              >
                <strong>Preview unavailable</strong>
                <p>{activeChartMeta?.disabledReason || "Preview is not available for this chart yet."}</p>
              </div>
            ) : previewChart ? (
              <div
                className="builder-preview-stage builder-canvas-stage"
                style={{
                  width: "100%",
                  minHeight: 0,
                  display: "grid",
                  gridTemplateRows: "auto minmax(0, 1fr)",
                  gap: 10,
                  padding: 10,
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--surface) 98%, #ffffff 2%) 0%, color-mix(in srgb, var(--surface-secondary) 86%, #eef4fb 14%) 100%)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "grid", gap: 2 }}>
                    <span className="builder-query-label">Live Preview</span>
                    <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>
                      {title || name || activeChartLabel || "Chart preview"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span className="builder-preview-chip is-soft">
                      {previewRowCount} row{previewRowCount === 1 ? "" : "s"}
                    </span>
                    <span className="builder-preview-chip">
                      {activeChartLabel ?? "Chart"}
                    </span>
                  </div>
                </div>

                {hasPreviewData ? (
                  <div
                    className="builder-preview-canvas builder-preview-canvas-compact"
                    style={{
                      minHeight: 0,
                      height: "100%",
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      border: "1px solid color-mix(in srgb, var(--border) 82%, #d7e3f4 18%)",
                      borderRadius: 6,
                      background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                      overflow: "hidden",
                    }}
                  >
                    <ChartRenderer
                      key={previewKey}
                      chart={previewChart.config}
                      data={previewData}
                      containerHeight="100%"
                      mode="builder-preview"
                      chrome="minimal"
                    />
                  </div>
                ) : isPreviewLoading ? (
                  <div className="builder-preview-inline-empty" style={{ maxWidth: 320 }}>
                    <strong>Preparing preview</strong>
                    <p>Applying the latest query and mappings.</p>
                  </div>
                ) : (
                  <div className="builder-preview-inline-empty" style={{ maxWidth: 280 }}>
                    <strong>{hasPreviewError ? "Preview error" : blockerCount ? "Map required fields" : "Preview ready"}</strong>
                    {emptyMessage ? <p>{emptyMessage}</p> : null}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="builder-preview-stage builder-preview-inline-empty"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minHeight: 260,
                }}
              >
                <strong>{selectedTable ? "Map required fields" : "Select a table"}</strong>
                {emptyMessage ? <p>{emptyMessage}</p> : null}
              </div>
            )}
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          <BuilderQuerySection
            chartDefinition={chartDefinition}
            selectedTable={selectedTable}
            aggregation={aggregation}
            queryPreview={queryPreview}
            slotAssignments={slotAssignments}
          />
        </div>
      </section>
    </main>
  );
}
