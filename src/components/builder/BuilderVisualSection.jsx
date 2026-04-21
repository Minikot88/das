import React, { useMemo } from "react";
import ChartTypeSelect from "./chartType/ChartTypeSelect";
import ChartVariantList from "./chartType/ChartVariantList";

export default function BuilderVisualSection({
  chartDefinition,
  chartType,
  activeChartMeta,
  activeChartFamilyMeta,
  activeChartVariantMeta,
  chartSelectorFamilies,
  chartSelectorCategories,
  visibleChartFamilies,
  visibleChartVariants,
  rendererSupport,
  selectedChartCategory,
  selectedChartFamily,
  selectedChartVariant,
  recommendedCharts,
  onChartFamilyChange,
  onChartVariantChange,
}) {
  const recommendedIds = useMemo(() => new Set((recommendedCharts ?? []).map((chart) => chart.id)), [recommendedCharts]);
  const orderedVariants = useMemo(
    () =>
      [...(visibleChartVariants ?? [])].sort((left, right) => {
        const leftRecommended = recommendedIds.has(left.chartId) ? 1 : 0;
        const rightRecommended = recommendedIds.has(right.chartId) ? 1 : 0;
        if (leftRecommended !== rightRecommended) return rightRecommended - leftRecommended;
        return 0;
      }),
    [recommendedIds, visibleChartVariants]
  );
  const activeCategoryMeta = useMemo(
    () => (chartSelectorCategories ?? []).find((category) => category.id === selectedChartCategory) ?? null,
    [chartSelectorCategories, selectedChartCategory]
  );
  const selectableVariantCount = useMemo(
    () => (orderedVariants ?? []).filter((variant) => variant.isSelectable).length,
    [orderedVariants]
  );

  return (
    <div className="builder-config-section builder-visual-section" style={{ gap: 8 }}>
      <div className="builder-section-head">
        <strong className="builder-section-title">Chart Type</strong>
      </div>

      <div className="builder-visual-compact-stack">
        <div className="builder-visual-current-strip" style={{ padding: "7px 8px", border: "1px solid var(--border)", borderRadius: 5 }}>
          <div>
            <span className="builder-query-label">Selected</span>
            <strong>{activeChartVariantMeta?.label ?? activeChartMeta?.name ?? "Chart"}</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span className="builder-chart-inline-badge">{activeChartFamilyMeta?.label ?? chartDefinition?.family}</span>
            <span className="builder-chart-inline-badge">Chart.js</span>
          </div>
        </div>

        <div className={`builder-chart-support-note${rendererSupport?.rendererSupported ? "" : " is-alert"}`}>
          <div className="builder-chart-support-note-head">
            <strong>
              {rendererSupport?.rendererSupported
                ? `${selectableVariantCount}/${orderedVariants.length || 0} variants ready in this family`
                : `${activeChartVariantMeta?.label ?? activeChartMeta?.name ?? "This chart"} needs a supported renderer`}
            </strong>
            <span className="builder-chart-inline-badge">
              {rendererSupport?.rendererSupported ? "Builder ready" : "Switch required"}
            </span>
          </div>
          <p>
            {rendererSupport?.rendererSupported
              ? "Only variants that the current Chart.js renderer can preview and save stay clickable."
              : "This selection is not wired to the current Chart.js renderer yet. Pick one of the available variants below to continue."}
          </p>
        </div>

        <ChartTypeSelect
          families={visibleChartFamilies?.length ? visibleChartFamilies : (chartSelectorFamilies ?? [])}
          selectedFamily={selectedChartFamily}
          selectedFamilyMeta={activeChartFamilyMeta}
          selectedCategory={activeCategoryMeta?.label ?? selectedChartCategory}
          onFamilyChange={onChartFamilyChange}
        />

        <div className="builder-chart-type-variant-panel">
          <div className="builder-chart-type-panel-head">
            <span className="builder-query-label">Available variants</span>
            <span className="builder-chart-inline-badge">
              {selectableVariantCount}/{orderedVariants.length} ready
            </span>
          </div>
          <div className="builder-chart-type-category-row">
            {(activeChartFamilyMeta?.categories ?? []).map((categoryId) => {
              const category = (chartSelectorCategories ?? []).find((item) => item.id === categoryId);
              return (
                <span key={categoryId} className="builder-chart-type-category-chip">
                  {category?.label ?? categoryId}
                </span>
              );
            })}
          </div>
          <ChartVariantList
            variants={orderedVariants}
            selectedVariant={selectedChartVariant ?? activeChartVariantMeta?.id ?? chartType}
            onVariantSelect={onChartVariantChange}
          />
        </div>
      </div>
    </div>
  );
}
