import React from "react";
import ChartRenderer from "../../components/charts/ChartRenderer";

export default function ChartPreviewPanel({ template, previewConfig, settings, validation }) {
  return (
    <section className="builder-v3-panel builder-v3-preview-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">Preview</span>
          <h2 className="builder-v3-title">{settings.title || template?.name || "Chart preview"}</h2>
        </div>
        <span className={`builder-v3-pill${validation.valid ? " is-success" : " is-warning"}`}>
          {validation.valid ? "Ready" : "Needs mapping"}
        </span>
      </div>

      {validation.errors.length ? (
        <div className="builder-v3-validation-card is-error">
          {validation.errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      {!validation.errors.length && validation.warnings.length ? (
        <div className="builder-v3-validation-card">
          {validation.warnings.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <div className="builder-v3-preview-frame">
        <ChartRenderer
          chart={{
            title: settings.title || template?.name || "Chart preview",
            subtitle: settings.subtitle,
            engine: "chartjs",
            type: previewConfig?.type,
            config: previewConfig,
          }}
          className="is-builder-preview"
          height="clamp(260px, 34vh, 420px)"
        />
      </div>
    </section>
  );
}
