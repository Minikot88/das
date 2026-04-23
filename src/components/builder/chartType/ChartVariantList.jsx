import React from "react";
import ChartVariantCard from "./ChartVariantCard";

export default function ChartVariantList({ variants, selectedVariant, showDescriptions = false, onVariantSelect }) {
  return (
    <div className="builder-chart-type-variant-list">
      {variants.map((variant) => (
        <ChartVariantCard
          key={variant.id}
          variant={variant}
          active={variant.id === selectedVariant}
          showDescriptions={showDescriptions}
          onSelect={onVariantSelect}
        />
      ))}
    </div>
  );
}
