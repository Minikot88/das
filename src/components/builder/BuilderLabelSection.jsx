import React from "react";

function Field({ label, value, placeholder, onChange }) {
  return (
    <label className="builder-form-field">
      <span className="builder-form-label">{label}</span>
      <input
        className="builder-form-input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function BuilderLabelSection({
  chartMeta,
  labelSettings,
  onLabelChange,
}) {
  const {
    name,
    title,
    subtitle,
    xLabel,
    yLabel,
    valueFormat,
    emptyStateLabel,
  } = labelSettings;
  const usesCartesianAxes = !["pie", "donut", "rose", "gauge", "kpi", "progress-ring", "table", "treemap", "sunburst", "funnel"].includes(chartMeta?.id);

  return (
    <div className="builder-config-section builder-inspector-section" style={{ gap: 6 }}>
      <div className="builder-section-head">
        <strong className="builder-section-title">Labels</strong>
      </div>

      <div className="builder-form-grid" style={{ gap: 6 }}>
        <Field
          label="Chart name"
          value={name}
          placeholder="Sales Overview"
          onChange={(nextValue) => onLabelChange("name", nextValue)}
        />
        <Field
          label="Title"
          value={title}
          placeholder="Sales by Market"
          onChange={(nextValue) => onLabelChange("title", nextValue)}
        />
        <Field
          label="Subtitle"
          value={subtitle}
          placeholder="Current Quarter"
          onChange={(nextValue) => onLabelChange("subtitle", nextValue)}
        />
        {usesCartesianAxes ? (
          <>
            <Field
              label="X Axis"
              value={xLabel}
              placeholder="Category"
              onChange={(nextValue) => onLabelChange("xLabel", nextValue)}
            />
            <Field
              label="Y Axis"
              value={yLabel}
              placeholder="Value"
              onChange={(nextValue) => onLabelChange("yLabel", nextValue)}
            />
          </>
        ) : null}
        <div className="builder-form-grid builder-form-grid-two">
          <label className="builder-form-field">
            <span className="builder-form-label">Value format</span>
            <select
              className="builder-form-input"
              value={valueFormat}
              onChange={(event) => onLabelChange("valueFormat", event.target.value)}
            >
              <option value="default">Default</option>
              <option value="compact">Compact</option>
              <option value="currency">Currency</option>
              <option value="percent">Percent</option>
            </select>
          </label>
          <Field
            label="Empty state"
            value={emptyStateLabel}
            placeholder="No data"
            onChange={(nextValue) => onLabelChange("emptyStateLabel", nextValue)}
          />
        </div>
      </div>
    </div>
  );
}
