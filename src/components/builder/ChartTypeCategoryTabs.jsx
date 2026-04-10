import React from "react";

const CATEGORY_LABELS = {
  comparison: "Comparison",
  trend: "Trend",
  distribution: "Distribution",
  composition: "Composition",
  relationship: "Relationship",
  hierarchy: "Hierarchy",
  flow: "Flow",
  statistical: "Statistical",
  geo: "Geo",
  matrix: "Matrix",
  summary: "Summary",
  table: "Table",
  advanced: "Advanced",
  custom: "Custom",
  recommended: "Recommended",
};

export default function ChartTypeCategoryTabs({
  categories = [],
  activeCategory,
  onChange,
}) {
  return (
    <div className="builder-chart-category-tabs" role="tablist" aria-label="Chart categories">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          role="tab"
          aria-selected={activeCategory === category.id}
          className={`builder-chart-category-tab${activeCategory === category.id ? " is-active" : ""}`}
          onClick={() => onChange(category.id)}
        >
          <span>{CATEGORY_LABELS[category.id] ?? category.label}</span>
        </button>
      ))}
    </div>
  );
}
