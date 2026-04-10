import React from "react";

export default function ChartFamilyItem({ family, active, onSelect }) {
  return (
    <button
      type="button"
      className={`builder-chart-family-item${active ? " is-active" : ""}`}
      onClick={() => onSelect(family.id)}
    >
      <div className="builder-chart-family-item-copy">
        <strong>{family.label}</strong>
        <p>{family.description}</p>
      </div>
      <span className="builder-chart-family-item-meta">{family.variants.length}</span>
    </button>
  );
}
