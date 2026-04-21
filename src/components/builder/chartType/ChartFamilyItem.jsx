import React from "react";

export default function ChartFamilyItem({ family, active, onSelect }) {
  const selectableCount = family.selectableCount ?? family.variants.length;
  const totalVariantCount = family.totalVariantCount ?? family.variants.length;

  return (
    <button
      type="button"
      className={`builder-chart-family-item${active ? " is-active" : ""}`}
      onClick={() => onSelect(family.id)}
      title={`${selectableCount}/${totalVariantCount} variants available`}
    >
      <div className="builder-chart-family-item-copy">
        <strong>{family.label}</strong>
        <p>{family.description}</p>
      </div>
      <span className="builder-chart-family-item-meta">{selectableCount}/{totalVariantCount}</span>
    </button>
  );
}
