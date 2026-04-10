import React from "react";

function formatSupportLabel(level) {
  if (level === "metadata-ready") return "Metadata";
  if (level === "partial") return "Partial";
  return "Supported";
}

export default function ChartVariantCard({ variant, active, onSelect }) {
  const supportLevel = variant.supportLevel ?? "supported";

  return (
    <button
      type="button"
      className={`builder-chart-variant-card${active ? " is-active" : ""}`}
      onClick={() => onSelect(variant.id)}
    >
      <div className="builder-chart-variant-card-copy">
        <strong>{variant.label}</strong>
        <p>{variant.description}</p>
      </div>
      <div
        className={`builder-chart-support-badge is-${supportLevel}`}
        title={variant.chartId}
      >
        {formatSupportLabel(supportLevel)}
      </div>
    </button>
  );
}
