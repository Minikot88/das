import React from "react";

function formatSupportLabel(level, variant) {
  if (variant?.rendererSupported === false) return "Not ready";
  if (variant?.supported === false) return "Disabled";
  if (variant?.previewSupported === false) return "Unavailable";
  if (level === "metadata-ready") return "Unavailable";
  if (level === "partial") return "Partial";
  return "Supported";
}

export default function ChartVariantCard({ variant, active, showDescriptions = false, onSelect }) {
  const supportLevel = variant.supportLevel ?? "supported";
  const isDisabled = variant.isSelectable === false;

  return (
    <button
      type="button"
      className={`builder-chart-variant-card${active ? " is-active" : ""}${isDisabled ? " is-disabled" : ""}`}
      onClick={() => onSelect(variant.id)}
      disabled={isDisabled}
      title={isDisabled ? variant.disabledReason : variant.chartId}
    >
      <div className="builder-chart-variant-card-copy">
        <strong>{variant.label}</strong>
        {showDescriptions ? <p>{variant.description}</p> : null}
      </div>
      <div
        className={`builder-chart-support-badge is-${variant?.rendererSupported === false ? "unsupported" : supportLevel}`}
        title={isDisabled ? variant.disabledReason : variant.chartId}
      >
        {formatSupportLabel(supportLevel, variant)}
      </div>
    </button>
  );
}
