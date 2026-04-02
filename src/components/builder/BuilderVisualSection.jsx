import React from "react";
import { CHART_TYPE_MAP, CHART_TYPES } from "../../utils/chartSuggestionV2";

function QuickVisualButton({ chart, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(chart.id)}
      className={`builder-visual-quick-btn${active ? " active" : ""}`}
      title={chart.label}
    >
      <span className="builder-visual-quick-icon" aria-hidden="true">{chart.icon.slice(0, 2).toUpperCase()}</span>
      <span className="builder-visual-quick-copy">
        <strong>{chart.label}</strong>
        <small>{chart.group}</small>
      </span>
    </button>
  );
}

export default function BuilderVisualSection({
  chartDefinition,
  suggestionResult,
  chartType,
  onChartTypeChange,
}) {
  const suggestedChart = suggestionResult?.suggested ? CHART_TYPE_MAP[suggestionResult.suggested] : null;
  const suggestionAlternatives = (suggestionResult?.alternatives ?? [])
    .map((chartId) => CHART_TYPE_MAP[chartId])
    .filter(Boolean);
  const quickCharts = Array.from(
    new Map([CHART_TYPE_MAP[chartType], suggestedChart, ...suggestionAlternatives].filter(Boolean).map((chart) => [chart.id, chart])).values()
  ).slice(0, 4);
  const activeChart = CHART_TYPE_MAP[chartType] ?? CHART_TYPE_MAP.bar;

  return (
    <div className="builder-config-section builder-visual-section">
      <div className="builder-section-head">
        <div>
          <span className="builder-query-label">Visuals</span>
          <p className="builder-section-description">Type</p>
        </div>
      </div>

      <div className="builder-visual-selector-panel">
        <div className="builder-visual-selector-copy">
          <span className="builder-visual-selector-label">Chart type</span>
          <strong>{activeChart.label}</strong>
          <span>{chartDefinition.family}</span>
        </div>
        <div className="builder-visual-selector-icon" aria-hidden="true">
          {(activeChart.icon ?? "CH").slice(0, 2).toUpperCase()}
        </div>
      </div>

      <div className="builder-inspector-field">
        <label className="builder-visual-menu-field">
          <span className="builder-query-label">Selector</span>
          <select
            className="builder-visual-select"
            value={chartType ?? ""}
            onChange={(event) => onChartTypeChange(event.target.value)}
          >
            {CHART_TYPES.map((chart) => (
              <option key={chart.id} value={chart.id}>
                {chart.label}
              </option>
            ))}
          </select>
        </label>

        <div className="builder-visual-active-card">
          <span className="builder-visual-active-icon">{(activeChart.icon ?? "CH").slice(0, 2).toUpperCase()}</span>
          <div className="builder-visual-active-copy">
            <strong>{activeChart.label}</strong>
            <span>{chartDefinition.family}</span>
            <small>{chartDefinition.title}</small>
          </div>
        </div>
      </div>

      {suggestedChart && suggestedChart.id !== chartType ? (
        <button
          type="button"
          className="builder-visual-suggested compact"
          onClick={() => onChartTypeChange(suggestedChart.id)}
        >
          <span className="builder-query-label">Suggested</span>
            <strong>{suggestedChart.label}</strong>
          <span>Suggested</span>
        </button>
      ) : null}

      {!!quickCharts.length && (
        <div className="builder-visual-subsection">
          <div className="builder-visual-subsection-head">
            <span className="builder-query-label">Quick picks</span>
            <span className="builder-inline-note">Fit</span>
          </div>
          <div className="builder-visual-quick-list compact">
            {quickCharts.map((chart) => (
              <QuickVisualButton
                key={chart.id}
                chart={chart}
                active={chartType === chart.id}
                onSelect={onChartTypeChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
