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
  title,
  subtitle,
  xLabel,
  yLabel,
  setBuilderState,
}) {
  const usesCartesianAxes = !["pie", "donut", "rose", "gauge", "kpi", "progress-ring", "table", "treemap", "sunburst", "funnel"].includes(chartMeta?.id);

  return (
    <div className="builder-config-section builder-inspector-section">
      <div className="builder-section-head">
        <div>
          <span className="builder-query-label">Labels</span>
          <p className="builder-section-description">Titles and axis labels</p>
        </div>
      </div>

      <div className="builder-form-grid">
        <Field
          label="Chart title"
          value={title}
          placeholder="Revenue by region"
          onChange={(nextValue) => setBuilderState({ title: nextValue })}
        />
        <Field
          label="Subtitle"
          value={subtitle}
          placeholder="Optional"
          onChange={(nextValue) => setBuilderState({ subtitle: nextValue })}
        />
        {usesCartesianAxes ? (
          <>
            <Field
              label="X axis title"
              value={xLabel}
              placeholder="Category"
              onChange={(nextValue) => setBuilderState({ xLabel: nextValue })}
            />
            <Field
              label="Y axis title"
              value={yLabel}
              placeholder="Value"
              onChange={(nextValue) => setBuilderState({ yLabel: nextValue })}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
