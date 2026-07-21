import React from "react";
import ChartRenderer from "@modules/charts/components/ChartRenderer";

export default function ChartPreviewPanel({ previewConfig, settings, validation, children }) {
  const previewTitle = typeof settings.title === "string" ? settings.title.trim() : "";
  const previewSubtitle = typeof settings.subtitle === "string" ? settings.subtitle.trim() : "";
  const previewType = String(previewConfig?.type ?? "").toLowerCase();
  const isPieLike = ["pie", "doughnut"].includes(previewType);
  const frameStyle = settings.backgroundColor
    ? { background: settings.backgroundColor }
    : undefined;

  return (
    <section className="builder-v3-panel builder-v3-preview-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">ตัวอย่าง</span>
          <h2 className="builder-v3-title">{previewTitle || "ตัวอย่าง"}</h2>
          {previewSubtitle ? <p className="builder-v3-preview-subtitle">{previewSubtitle}</p> : null}
        </div>
        <span className={`builder-v3-pill${validation.valid ? " is-success" : " is-warning"}`}>
          {validation.valid ? "พร้อมใช้" : "ต้องแมปฟิลด์"}
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

      <div className={`builder-v3-preview-frame${isPieLike ? " is-pie-like" : ""}`} style={frameStyle}>
        <ChartRenderer
          chart={{
            title: previewTitle,
            subtitle: previewSubtitle,
            settings: {
              ...(settings ?? {}),
              title: previewTitle,
              subtitle: previewSubtitle,
            },
            engine: "chartjs",
            type: previewConfig?.type,
            config: previewConfig,
          }}
          className="is-builder-preview"
          height="clamp(240px, 32vh, 360px)"
        />
      </div>
      {children ? <div className="builder-v3-preview-sql-slot">{children}</div> : null}
    </section>
  );
}
