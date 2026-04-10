import React from "react";
import ChartFamilyList from "./ChartFamilyList";

export default function ChartFamilyDropdown({
  families,
  selectedFamily,
  selectedCategory,
  onFamilySelect,
}) {
  return (
    <div className="builder-chart-family-dropdown">
      <div className="builder-chart-family-dropdown-head">
        <span className="builder-query-label">Chart families</span>
        {selectedCategory ? (
          <span className="builder-chart-type-category-chip">{selectedCategory}</span>
        ) : null}
      </div>
      <ChartFamilyList
        families={families}
        selectedFamily={selectedFamily}
        onSelect={onFamilySelect}
      />
    </div>
  );
}
