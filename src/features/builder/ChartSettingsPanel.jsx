import React from "react";

const PALETTE_OPTIONS = [
  { value: "chartjs", label: "Chart.js" },
  { value: "ocean", label: "Ocean" },
  { value: "sunset", label: "Sunset" },
  { value: "earth", label: "Earth" },
  { value: "neutral", label: "Neutral" },
];

function Toggle({ label, checked, onChange }) {
  return (
    <label className="builder-v3-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function ColorGroup({ label, colors = [], onChange }) {
  const nextColors = [...colors];
  while (nextColors.length < 4) nextColors.push("");

  return (
    <div className="builder-v3-field">
      <span>{label}</span>
      <div className="builder-v3-color-grid">
        {nextColors.map((color, index) => (
          <label key={`${label}-${index}`} className="builder-v3-color-swatch">
            <input
              type="color"
              value={color || "#36a2eb"}
              onChange={(event) => {
                const updatedColors = [...nextColors];
                updatedColors[index] = event.target.value;
                onChange(updatedColors.filter(Boolean));
              }}
            />
            <small>{index + 1}</small>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ChartSettingsPanel({ template, settings, onSettingChange }) {
  const allowStacked = ["bar", "area", "mixed"].includes(template?.family);
  const allowHorizontal = template?.family === "bar" && template?.variant !== "floating";
  const allowLineWidth = ["line", "area", "mixed", "scatter", "bubble", "radar"].includes(template?.family);
  const allowBarRadius = ["bar", "mixed"].includes(template?.family);

  return (
    <section className="builder-v3-panel builder-v3-settings-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">Settings</span>
          <h2 className="builder-v3-title">Display and appearance</h2>
        </div>
      </div>

      <div className="builder-v3-subsection">
        <div className="builder-v3-inline-meta">
          <strong>Display</strong>
          <span>Core chart behavior and layout.</span>
        </div>

        <div className="builder-v3-form-grid">
          <label className="builder-v3-field">
            <span>Chart title</span>
            <input value={settings.title} onChange={(event) => onSettingChange("title", event.target.value)} />
          </label>

          <label className="builder-v3-field">
            <span>Subtitle</span>
            <input value={settings.subtitle} onChange={(event) => onSettingChange("subtitle", event.target.value)} />
          </label>

          <label className="builder-v3-field">
            <span>Aggregation</span>
            <select value={settings.aggregation} onChange={(event) => onSettingChange("aggregation", event.target.value)}>
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="count">Count</option>
            </select>
          </label>

          <label className="builder-v3-field">
            <span>Legend position</span>
            <select value={settings.legendPosition} onChange={(event) => onSettingChange("legendPosition", event.target.value)}>
              <option value="bottom">Bottom</option>
              <option value="right">Right</option>
              <option value="top">Top</option>
              <option value="left">Left</option>
            </select>
          </label>
        </div>

        <div className="builder-v3-toggle-grid">
          <Toggle label="Show legend" checked={settings.showLegend} onChange={(value) => onSettingChange("showLegend", value)} />
          <Toggle label="Show grid" checked={settings.showGrid} onChange={(value) => onSettingChange("showGrid", value)} />
          <Toggle label="Begin at zero" checked={settings.beginAtZero} onChange={(value) => onSettingChange("beginAtZero", value)} />
          {allowStacked ? (
            <Toggle label="Stacked" checked={settings.stacked} onChange={(value) => onSettingChange("stacked", value)} />
          ) : null}
          {allowHorizontal ? (
            <Toggle label="Horizontal" checked={settings.horizontal} onChange={(value) => onSettingChange("horizontal", value)} />
          ) : null}
        </div>
      </div>

      <div className="builder-v3-subsection">
        <div className="builder-v3-inline-meta">
          <strong>Appearance</strong>
          <span>Useful styling only, applied to preview and saved charts.</span>
        </div>

        <div className="builder-v3-form-grid">
          <label className="builder-v3-field">
            <span>Color palette</span>
            <select value={settings.palette} onChange={(event) => onSettingChange("palette", event.target.value)}>
              {PALETTE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="builder-v3-field">
            <span>Chart background</span>
            <input type="color" value={settings.backgroundColor} onChange={(event) => onSettingChange("backgroundColor", event.target.value)} />
          </label>

          <label className="builder-v3-field">
            <span>Border color</span>
            <input type="color" value={settings.borderColor || "#1f2937"} onChange={(event) => onSettingChange("borderColor", event.target.value)} />
          </label>

          <label className="builder-v3-field">
            <span>Title color</span>
            <input type="color" value={settings.titleColor} onChange={(event) => onSettingChange("titleColor", event.target.value)} />
          </label>

          <label className="builder-v3-field">
            <span>Axis label color</span>
            <input type="color" value={settings.axisLabelColor} onChange={(event) => onSettingChange("axisLabelColor", event.target.value)} />
          </label>

          <label className="builder-v3-field">
            <span>Chart card background</span>
            <input type="color" value={settings.cardBackground || "#ffffff"} onChange={(event) => onSettingChange("cardBackground", event.target.value)} />
          </label>

          {allowLineWidth ? (
            <label className="builder-v3-field">
              <span>Line width</span>
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={settings.lineWidth}
                onChange={(event) => onSettingChange("lineWidth", Number(event.target.value))}
              />
            </label>
          ) : null}

          {allowBarRadius ? (
            <label className="builder-v3-field">
              <span>Bar radius</span>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={settings.barBorderRadius}
                onChange={(event) => onSettingChange("barBorderRadius", Number(event.target.value))}
              />
            </label>
          ) : null}
        </div>

        <ColorGroup
          label="Dataset colors"
          colors={settings.datasetColors}
          onChange={(value) => onSettingChange("datasetColors", value)}
        />
      </div>
    </section>
  );
}
