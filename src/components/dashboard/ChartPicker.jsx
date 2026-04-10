import React, { memo } from "react";

const CHART_TYPE_ICONS = {
  line: "LN",
  area: "AR",
  bar: "BR",
  "stacked-bar": "SB",
  "grouped-bar": "GB",
  pie: "PI",
  donut: "DN",
  scatter: "SC",
  heatmap: "HM",
  kpi: "KP",
};

const ChartPicker = memo(function ChartPicker({ charts, onSelect, onClose }) {
  if (!charts) return null;

  return (
    <div className="chart-picker-overlay" onClick={onClose}>
      <div className="chart-picker" onClick={(event) => event.stopPropagation()}>
        <div className="chart-picker-header">
          <div>
            <h3>Saved charts</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">X</button>
        </div>

        <div className="chart-picker-list">
          {charts.length === 0 ? (
            <div className="chart-picker-empty">No saved charts.</div>
          ) : (
            charts.map((chart) => {
              const chartType = chart.config?.chartType || chart.config?.type || "bar";
              return (
                <button
                  key={chart.id}
                  type="button"
                  className="chart-picker-item"
                  onClick={() => {
                    onSelect(chart.id);
                    onClose();
                  }}
                >
                  <span className="chart-picker-item-code">{CHART_TYPE_ICONS[chartType] || "CH"}</span>
                  <span className="chart-picker-item-copy">
                    <strong>{chart.name}</strong>
                    <span>{chartType}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});

export default ChartPicker;
