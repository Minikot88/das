import React from "react";

const PALETTES = [
  { value: "default", label: "Default" },
  { value: "cool", label: "Cool" },
  { value: "warm", label: "Warm" },
  { value: "executive", label: "Executive" },
  { value: "echarts-classic", label: "ECharts Classic" },
];

function Toggle({ label, checked, onChange, hint = "" }) {
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

export default function DisplayOptionsSection({
  displayOptions,
  onDisplayChange,
}) {
  const {
    colorTheme,
    showLegend,
    legendPosition,
    showTooltip,
    showGrid,
    showAxis,
    showLabels,
    backgroundOpacity,
    padding,
  } = displayOptions;

  return (
    <div className="builder-config-section builder-inspector-section" style={{ gap: 6 }}>
      <div className="builder-section-head">
        <strong className="builder-section-title">Display</strong>
      </div>

      <div className="builder-display-stack" style={{ gap: 6 }}>
        <Toggle
          label="Legend"
          hint="Shared legend."
          checked={showLegend !== false}
          onChange={(nextValue) => onDisplayChange("showLegend", nextValue)}
        />
        <Toggle
          label="Tooltip"
          hint="Hover details."
          checked={showTooltip !== false}
          onChange={(nextValue) => onDisplayChange("showTooltip", nextValue)}
        />
        <Toggle
          label="Grid lines"
          hint="Axis grid."
          checked={showGrid !== false}
          onChange={(nextValue) => onDisplayChange("showGrid", nextValue)}
        />
        <Toggle
          label="Axes"
          hint="Axis chrome."
          checked={showAxis !== false}
          onChange={(nextValue) => onDisplayChange("showAxis", nextValue)}
        />
        <Toggle
          label="Data labels"
          hint="Shared labels."
          checked={showLabels === true}
          onChange={(nextValue) => onDisplayChange("showLabels", nextValue)}
        />

        <div className="builder-form-grid builder-form-grid-two">
          <label className="builder-form-field">
            <span className="builder-form-label">Color theme</span>
            <select
              className="builder-form-input"
              value={colorTheme}
              onChange={(event) => onDisplayChange("colorTheme", event.target.value)}
            >
              {PALETTES.map((palette) => (
                <option key={palette.value} value={palette.value}>
                  {palette.label}
                </option>
              ))}
            </select>
          </label>
          <label className="builder-form-field">
            <span className="builder-form-label">Legend position</span>
            <select
              className="builder-form-input"
              value={legendPosition}
              onChange={(event) => onDisplayChange("legendPosition", event.target.value)}
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
        </div>

        <div className="builder-form-grid builder-form-grid-two">
          <label className="builder-form-field">
            <span className="builder-form-label">Background transparency</span>
            <input
              className="builder-form-input"
              type="range"
              min="0"
              max="0.9"
              step="0.05"
              value={backgroundOpacity}
              onChange={(event) => onDisplayChange("backgroundOpacity", Number(event.target.value))}
            />
          </label>
          <label className="builder-form-field">
            <span className="builder-form-label">Padding</span>
            <input
              className="builder-form-input"
              type="number"
              min="0"
              max="64"
              step="2"
              value={padding}
              onChange={(event) => onDisplayChange("padding", Number(event.target.value))}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
