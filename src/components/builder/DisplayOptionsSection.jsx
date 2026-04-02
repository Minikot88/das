import React from "react";

const PALETTES = [
  { value: "default", label: "Default" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "warm", label: "Warm" },
  { value: "echarts", label: "ECharts Classic" },
];

function Toggle({ label, checked, onChange }) {
  return (
    <label className="builder-toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export default function DisplayOptionsSection({
  legendVisible,
  showGrid,
  showLabels,
  colorTheme,
  setBuilderState,
}) {
  return (
    <div className="builder-config-section builder-inspector-section">
      <div className="builder-section-head">
        <div>
          <span className="builder-query-label">Display</span>
          <p className="builder-section-description">Compact visual controls</p>
        </div>
      </div>

      <div className="builder-display-stack">
        <Toggle
          label="Legend"
          checked={legendVisible !== false}
          onChange={(nextValue) => setBuilderState({ legendVisible: nextValue })}
        />
        <Toggle
          label="Grid lines"
          checked={showGrid !== false}
          onChange={(nextValue) => setBuilderState({ showGrid: nextValue })}
        />
        <Toggle
          label="Series labels"
          checked={showLabels === true}
          onChange={(nextValue) => setBuilderState({ showLabels: nextValue })}
        />
        <label className="builder-form-field">
          <span className="builder-form-label">Palette</span>
          <select
            className="builder-form-input"
            value={colorTheme}
            onChange={(event) => setBuilderState({ colorTheme: event.target.value })}
          >
            {PALETTES.map((palette) => (
              <option key={palette.value} value={palette.value}>
                {palette.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
