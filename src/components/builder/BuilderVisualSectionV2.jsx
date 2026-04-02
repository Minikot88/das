import React, { useEffect, useMemo, useState } from "react";
import { getChartCategories } from "../../utils/chartCatalog";
import ChartTypeCategoryTabs from "./ChartTypeCategoryTabs";
import ChartTypeHoverPreview from "./ChartTypeHoverPreview";

function ChartTypeListItem({ chart, active, recommended, hovered, onSelect, onHover }) {
  const disabled = !chart.supported;
  const statusLabel = recommended
    ? "Recommended"
    : chart.previewSupported === false && chart.supported
      ? "Preview limited"
      : chart.experimental
        ? "Experimental"
        : chart.badges?.[0] ?? "";

  return (
    <div
      className="builder-chart-list-item-wrap"
      onMouseEnter={() => onHover(chart)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        type="button"
        onClick={() => !disabled && onSelect(chart.id)}
        disabled={disabled}
        className={`builder-chart-list-item${active ? " is-active" : ""}${disabled ? " is-disabled" : ""}`}
        title={disabled ? chart.disabledReason : chart.description}
      >
        <div className="builder-chart-list-item-main">
          <div className="builder-chart-list-item-title-row">
            <strong>{chart.name}</strong>
            {statusLabel ? <span className="builder-chart-inline-badge">{statusLabel}</span> : null}
          </div>
          <p>{chart.description}</p>
        </div>
        <span className="builder-chart-list-item-code">{chart.shortName}</span>
      </button>
      {hovered ? <ChartTypeHoverPreview chart={chart} /> : null}
    </div>
  );
}

export default function BuilderVisualSectionV2({
  chartDefinition,
  chartType,
  activeChartMeta,
  chartCatalog,
  recommendedCharts,
  onChartTypeChange,
}) {
  const [activeCategory, setActiveCategory] = useState(activeChartMeta?.category ?? "comparison");
  const [hoveredChart, setHoveredChart] = useState(null);
  const recommendedIds = useMemo(() => new Set((recommendedCharts ?? []).map((chart) => chart.id)), [recommendedCharts]);
  const categories = useMemo(
    () => getChartCategories().filter((category) => category.id !== "recommended"),
    []
  );
  const categoryCharts = useMemo(
    () => chartCatalog.filter((chart) => chart.category === activeCategory),
    [activeCategory, chartCatalog]
  );

  useEffect(() => {
    if (activeChartMeta?.category && activeChartMeta.category !== activeCategory) {
      setActiveCategory(activeChartMeta.category);
    }
  }, [activeCategory, activeChartMeta?.category]);

  return (
    <div className="builder-config-section builder-visual-section">
      <div className="builder-section-head">
        <div>
          <span className="builder-query-label">Visuals</span>
          <p className="builder-section-description">Category and chart type</p>
        </div>
      </div>

      <div className="builder-visual-compact-stack">
        <div className="builder-visual-current-strip">
          <div>
            <span className="builder-query-label">Current</span>
            <strong>{activeChartMeta?.name ?? "Chart"}</strong>
          </div>
          <span className="builder-chart-inline-badge">{chartDefinition?.family}</span>
        </div>

        <ChartTypeCategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onChange={setActiveCategory}
        />

        <div className="builder-chart-list">
          {categoryCharts.map((chart) => (
            <ChartTypeListItem
              key={chart.id}
              chart={chart}
              active={chartType === chart.id}
              recommended={recommendedIds.has(chart.id)}
              hovered={hoveredChart?.id === chart.id}
              onSelect={onChartTypeChange}
              onHover={setHoveredChart}
            />
          ))}
        </div>

        <div className="builder-visual-mini-help">
          <span>{hoveredChart ? "Previewing on hover" : "Hover a chart name to preview"}</span>
          <span>{categoryCharts.length} chart types</span>
        </div>
      </div>
    </div>
  );
}
