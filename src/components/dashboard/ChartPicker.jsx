import React, { memo } from "react";

const CHART_TYPE_ICONS = {
  line: "LN",
  bar: "BR",
  doughnut: "DN",
  pie: "PI",
  polarArea: "PA",
  radar: "RD",
  scatter: "SC",
  bubble: "BB",
};

function resolveChartType(chart) {
  return chart.type || chart.config?.type || chart.family || "chart";
}

const CHART_FAMILY_ICONS = {
  bar: "BR",
  line: "LN",
  area: "AR",
  doughnut: "DN",
  pie: "PI",
  radar: "RD",
  scatter: "SC",
  bubble: "BB",
  mixed: "MX",
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
              const chartType = resolveChartType(chart);
              const icon = CHART_TYPE_ICONS[chartType] || CHART_FAMILY_ICONS[chart.family] || "CH";
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
                  <span className="chart-picker-item-code">{icon}</span>
                  <span className="chart-picker-item-copy">
                    <strong>{chart.title || chart.name}</strong>
                    <span>{chart.variant || chart.family || chartType}</span>
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
