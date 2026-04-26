import React from "react";

function resolveSupportState(level, variant) {
  if (
    variant?.rendererSupported === false
    || variant?.supported === false
    || variant?.previewSupported === false
    || level === "metadata-ready"
  ) {
    return { label: "Coming Soon", tone: "coming-soon" };
  }

  if (level === "partial") {
    return { label: "Partial", tone: "partial" };
  }

  return { label: "Supported", tone: "supported" };
}

function getVariantVisualKind(variant) {
  const token = [
    variant?.id,
    variant?.chartId,
    variant?.family,
    variant?.renderingStrategy,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (token.includes("mixed")) return "mixed";
  if (token.includes("polar") || token.includes("rose")) return "polar";
  if (token.includes("pie") || token.includes("donut")) return "pie";
  if (token.includes("gauge") || token.includes("ring")) return "gauge";
  if (token.includes("radar")) return "radar";
  if (token.includes("scatter") || token.includes("bubble")) return "scatter";
  if (token.includes("area")) return "area";
  if (token.includes("line")) return "line";
  return "bar";
}

function VariantMiniPreview({ kind }) {
  switch (kind) {
    case "line":
      return (
        <svg viewBox="0 0 64 40" aria-hidden="true">
          <path d="M2 33H62" className="axis" />
          <path d="M4 27L18 19L30 23L44 12L60 16" className="series" />
        </svg>
      );
    case "area":
      return (
        <svg viewBox="0 0 64 40" aria-hidden="true">
          <path d="M2 33H62" className="axis" />
          <path d="M4 27L18 19L30 23L44 12L60 16L60 33L4 33Z" className="fill" />
          <path d="M4 27L18 19L30 23L44 12L60 16" className="series" />
        </svg>
      );
    case "pie":
      return (
        <svg viewBox="0 0 64 40" aria-hidden="true">
          <circle cx="32" cy="20" r="12" className="ring-bg" />
          <path d="M32 20 L32 8 A12 12 0 0 1 43.4 27.5 Z" className="slice-1" />
          <path d="M32 20 L43.4 27.5 A12 12 0 0 1 20.6 27.5 Z" className="slice-2" />
          <path d="M32 20 L20.6 27.5 A12 12 0 0 1 32 8 Z" className="slice-3" />
        </svg>
      );
    case "scatter":
      return (
        <svg viewBox="0 0 64 40" aria-hidden="true">
          <path d="M2 33H62" className="axis" />
          <circle cx="14" cy="24" r="3" className="point" />
          <circle cx="26" cy="15" r="2.5" className="point" />
          <circle cx="40" cy="21" r="4" className="point" />
          <circle cx="52" cy="12" r="3" className="point" />
        </svg>
      );
    case "radar":
      return (
        <svg viewBox="0 0 64 40" aria-hidden="true">
          <polygon points="32,6 47,14 42,30 22,30 17,14" className="radar-grid" />
          <polygon points="32,10 42,16 39,27 24,26 20,17" className="radar-shape" />
        </svg>
      );
    case "gauge":
      return (
        <svg viewBox="0 0 64 40" aria-hidden="true">
          <path d="M10 30 A22 22 0 0 1 54 30" className="ring-bg" />
          <path d="M10 30 A22 22 0 0 1 38 9" className="series" />
        </svg>
      );
    case "mixed":
      return (
        <svg viewBox="0 0 64 40" aria-hidden="true">
          <path d="M2 33H62" className="axis" />
          <rect x="8" y="20" width="7" height="13" className="bar" />
          <rect x="23" y="15" width="7" height="18" className="bar" />
          <rect x="38" y="23" width="7" height="10" className="bar" />
          <path d="M6 25L20 13L34 18L48 10L60 14" className="series" />
        </svg>
      );
    case "polar":
      return (
        <svg viewBox="0 0 64 40" aria-hidden="true">
          <circle cx="32" cy="20" r="12" className="ring-bg" />
          <path d="M32 20 L32 8 A12 12 0 0 1 44 20 Z" className="slice-1" />
          <path d="M32 20 L44 20 A12 12 0 0 1 32 32 Z" className="slice-2" />
          <path d="M32 20 L32 32 A12 12 0 0 1 20 20 Z" className="slice-3" />
          <path d="M32 20 L20 20 A12 12 0 0 1 32 8 Z" className="slice-4" />
        </svg>
      );
    case "bar":
    default:
      return (
        <svg viewBox="0 0 64 40" aria-hidden="true">
          <path d="M2 33H62" className="axis" />
          <rect x="8" y="18" width="8" height="15" className="bar" />
          <rect x="24" y="13" width="8" height="20" className="bar" />
          <rect x="40" y="22" width="8" height="11" className="bar" />
        </svg>
      );
  }
}

export default function ChartVariantCard({ variant, active, showDescriptions = false, onSelect }) {
  const supportLevel = variant.supportLevel ?? "supported";
  const supportState = resolveSupportState(supportLevel, variant);
  const visualKind = getVariantVisualKind(variant);
  const isDisabled = variant.isSelectable === false;

  return (
    <button
      type="button"
      className={`builder-chart-variant-card${active ? " is-active" : ""}${isDisabled ? " is-disabled" : ""}`}
      onClick={() => onSelect(variant.id)}
      disabled={isDisabled}
      title={isDisabled ? variant.disabledReason : variant.chartId}
    >
      <div className="builder-chart-variant-card-leading">
        <span className={`builder-chart-variant-thumb is-${visualKind}`}>
          <VariantMiniPreview kind={visualKind} />
        </span>
        <div className="builder-chart-variant-card-copy">
          <strong>{variant.label}</strong>
          {showDescriptions ? <p>{variant.description}</p> : null}
        </div>
      </div>
      <div
        className={`builder-chart-support-badge is-${supportState.tone}`}
        title={isDisabled ? variant.disabledReason : variant.chartId}
      >
        {supportState.label}
      </div>
    </button>
  );
}
