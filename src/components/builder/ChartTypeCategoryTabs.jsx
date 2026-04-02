import React from "react";

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
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
}
