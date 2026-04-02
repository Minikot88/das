import React from "react";
import ChartRenderer from "../charts/ChartRendererV2";
import BuilderQuerySection from "./BuilderQuerySection";

export default function BuilderPreviewPane({
  title,
  name,
  subtitle,
  chartDefinition,
  activeChartLabel,
  activeChartMeta,
  selectedTable,
  previewChart,
  previewData,
  queryPreview,
  aggregation,
  readinessLabel,
  mappedCount,
  mappedTarget,
  slotAssignments,
  validationSummary,
  previewSupported,
  completedRequiredRoleCount,
  requiredRoleCount,
}) {
  const hasQueryPreview = Boolean(queryPreview?.sql);
  const blockerCount = validationSummary?.blockers?.length ?? 0;
  const hasPreviewData = Array.isArray(previewData) && previewData.length > 0;

  let emptyMessage = "Preview unavailable";
  if (blockerCount) {
    emptyMessage = validationSummary?.blockers?.[0]?.title ?? "Add required fields";
  } else if (!selectedTable) {
    emptyMessage = "Pick a table";
  } else if (!hasPreviewData) {
    emptyMessage = "No rows";
  }

  return (
    <main className="builder-pane-shell builder-pane-shell-center">
      <section className="builder-preview-panel builder-preview-panel-compact">
        <div className="builder-pane-header builder-pane-header-compact">
          <div className="builder-pane-header-copy">
            <h2 className="builder-pane-title">Preview</h2>
            <p className="builder-pane-caption">{activeChartLabel ?? "Chart"} {selectedTable ? `· ${selectedTable}` : ""}</p>
          </div>
          <div className="builder-preview-stage-status">
            {title || name ? <span className="builder-preview-chip">{title || name}</span> : null}
          </div>
        </div>

        {previewSupported === false ? (
          <div className="builder-preview-stage builder-preview-inline-empty">
            <strong>{activeChartLabel} preview unavailable</strong>
            <p>{activeChartMeta?.disabledReason || "Preview unavailable for this chart type."}</p>
          </div>
        ) : previewChart ? (
          <div className="builder-preview-stage builder-canvas-stage">
            {hasPreviewData ? (
              <div className="builder-preview-canvas builder-preview-canvas-compact">
                <ChartRenderer chart={previewChart.config} data={previewData} containerHeight="100%" />
              </div>
            ) : (
              <div className="builder-preview-inline-empty">
                <strong>{activeChartLabel} preview unavailable</strong>
                <p>{emptyMessage}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="builder-preview-stage builder-preview-inline-empty">
            <strong>{activeChartLabel} preview unavailable</strong>
            <p>{blockerCount ? emptyMessage : "Add required fields"}</p>
          </div>
        )}
        <BuilderQuerySection
          chartDefinition={chartDefinition}
          selectedTable={selectedTable}
          aggregation={aggregation}
          queryPreview={queryPreview}
          slotAssignments={slotAssignments}
        />
      </section>
    </main>
  );
}
