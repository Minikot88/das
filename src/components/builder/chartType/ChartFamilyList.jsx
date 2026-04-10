import React from "react";
import ChartFamilyItem from "./ChartFamilyItem";

export default function ChartFamilyList({ families, selectedFamily, onSelect }) {
  return (
    <div className="builder-chart-family-list">
      {families.map((family) => (
        <ChartFamilyItem
          key={family.id}
          family={family}
          active={family.id === selectedFamily}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
