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
      className="builder-preview-role-card"
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
        className="builder-preview-role-card-head"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <strong className="builder-preview-role-card-title" style={{ fontSize: 12, color: "var(--text-primary)" }}>{role.label}</strong>
        <span
          className="builder-preview-role-card-status"
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
      <span className="builder-preview-role-card-copy" style={{ fontSize: 10, color: isMapped ? "var(--text-primary)" : "var(--text-secondary)" }}>
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
  const previewHint = previewState?.hint ?? "";
  const isPreviewLoading = previewStatusState === "loading";
  const isPreviewSuccess = previewStatusState === "success";
  const hasPreviewError = ["invalid_config", "render_error"].includes(previewStatusState) && Boolean(previewError);
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

  const previewStatusMeta = {
    idle: { label: "Idle", title: selectedTable ? "Map fields to preview" : "Select a table", message: selectedTable ? "Choose fields for at least one category and one numeric value. Preview will update automatically." : "Choose a table to begin building a chart." },
    loading: { label: "Loading", title: "Preparing preview", message: "Applying the latest chart settings and query." },
    missing_required_mappings: { label: "Needs mapping", title: "Map required fields", message: previewError || validationSummary?.blockers?.[0]?.title || "Map the required roles before preview can render." },
    no_rows: { label: "No rows", title: "No rows", message: previewError || "The current chart settings returned no rows." },
    unsupported_chart: { label: "Unsupported", title: "Preview not available", message: previewError || activeChartMeta?.disabledReason || "This chart is not available for preview in the current runtime." },
    invalid_config: { label: "Invalid", title: "Preview unavailable", message: previewError || "The current mapping does not produce a renderable chart." },
    render_error: { label: "Error", title: "Preview error", message: previewError || "The preview could not be generated." },
    success: { label: "Preview", title: "Live Preview", message: "" },
  };
  const currentPreviewStatus = previewStatusMeta[previewStatusState] ?? previewStatusMeta.idle;

  const requiredRoles = (roleAssignments ?? []).filter((role) => role.required);
  const optionalRoles = (roleAssignments ?? []).filter((role) => !role.required && role.fields?.length);
  const isPreviewRenderable = previewStatusState === "success" && hasPreviewData;
  const mappingHeadline = blockerCount
    ? validationSummary?.blockers?.[0]?.title ?? "Mapping required"
    : requiredRoleCount
      ? `${completedRequiredRoleCount}/${requiredRoleCount} required mappings ready`
      : isPreviewRenderable
        ? "Preview ready"
        : currentPreviewStatus.title;
  const previewStatus = currentPreviewStatus.label;
  const mappingTone = blockerCount || !isPreviewRenderable ? "var(--warning)" : "var(--success)";
  const mappingBackground = blockerCount || !isPreviewRenderable ? "var(--warning-soft)" : "var(--success-soft)";
  const previewStageBackground =
    "linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, transparent) 0%, color-mix(in srgb, var(--surface-secondary) 90%, transparent) 100%)";
  const previewCanvasBackground =
    "linear-gradient(180deg, color-mix(in srgb, var(--surface) 98%, transparent) 0%, color-mix(in srgb, var(--surface-secondary) 94%, transparent) 100%)";

  return (
    <main
      className="builder-pane-shell builder-pane-shell-center"
      style={{
        flex: "1 1 auto",
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <section
        className="builder-preview-panel builder-preview-panel-compact"
        style={{
          flex: "1 1 auto",
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
            className="builder-preview-mapping-board"
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
              className="builder-preview-mapping-head"
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
                className="builder-preview-mapping-status"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 20,
                  padding: "0 7px",
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  background: mappingBackground,
                  color: mappingTone,
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
              className="builder-preview-role-grid"
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
              <div className="builder-preview-role-optional" style={{ display: "grid", gap: 4 }}>
                <span className="builder-query-label" style={{ fontSize: 10 }}>Optional</span>
                <div
                  className="builder-preview-role-grid builder-preview-role-grid-optional"
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
            {previewStatusState === "unsupported_chart" || previewSupported === false ? (
              <div
                className="builder-preview-stage"
                style={{
                  width: "100%",
                  minHeight: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div className="builder-preview-inline-empty" style={{ maxWidth: 320, margin: 0 }}>
                  <strong>{currentPreviewStatus.title}</strong>
                  <p>{currentPreviewStatus.message}</p>
                </div>
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
                  background: previewStageBackground,
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
                    {previewHint ? (
                      <span className="builder-preview-chip is-soft">
                        {previewHint}
                      </span>
                    ) : null}
                    <span className="builder-preview-chip is-soft">
                      {previewRowCount} row{previewRowCount === 1 ? "" : "s"}
                    </span>
                    <span className="builder-preview-chip">
                      {activeChartLabel ?? "Chart"}
                    </span>
                  </div>
                </div>

                {isPreviewSuccess && hasPreviewData ? (
                  <div
                    className="builder-preview-canvas builder-preview-canvas-compact"
                    style={{
                      minHeight: 0,
                      height: "100%",
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      background: previewCanvasBackground,
                      boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--surface) 86%, transparent)",
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
                    <strong>{currentPreviewStatus.title}</strong>
                    <p>{currentPreviewStatus.message}</p>
                  </div>
                ) : (
                  <div className="builder-preview-inline-empty" style={{ maxWidth: 280 }}>
                    <strong>{currentPreviewStatus.title}</strong>
                    {currentPreviewStatus.message ? <p>{currentPreviewStatus.message}</p> : null}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="builder-preview-stage"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minHeight: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div className="builder-preview-inline-empty" style={{ maxWidth: 320, margin: 0 }}>
                  <strong>{currentPreviewStatus.title}</strong>
                  {currentPreviewStatus.message ? <p>{currentPreviewStatus.message}</p> : null}
                </div>
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
