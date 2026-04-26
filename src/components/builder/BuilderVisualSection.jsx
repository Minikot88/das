import React, { useMemo, useState } from "react";
import ChartTypeSelect from "./chartType/ChartTypeSelect";
import ChartVariantList from "./chartType/ChartVariantList";

function includesSearchTerm(value, query) {
  return String(value ?? "").toLowerCase().includes(query);
}

function familyMatchesQuery(family, query) {
  const familyTokens = [
    family.label,
    family.description,
    family.iconKey,
    ...(family.categories ?? []),
  ];

  const variantTokens = (family.variants ?? []).flatMap((variant) => [
    variant.label,
    variant.description,
    variant.chartId,
    variant.id,
  ]);

  return [...familyTokens, ...variantTokens].some((token) => includesSearchTerm(token, query));
}

function variantMatchesQuery(variant, query) {
  const variantTokens = [
    variant.label,
    variant.description,
    variant.chartId,
    variant.id,
    variant.family,
    variant.renderingStrategy,
    variant.chart?.label,
    variant.chart?.name,
  ];

  return variantTokens.some((token) => includesSearchTerm(token, query));
}

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
  showDescriptions = false,
  onChartFamilyChange,
  onChartVariantChange,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const recommendedIds = useMemo(() => new Set((recommendedCharts ?? []).map((chart) => chart.id)), [recommendedCharts]);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const familySource = visibleChartFamilies?.length
    ? visibleChartFamilies
    : (chartSelectorFamilies ?? []);
  const filteredFamilies = useMemo(() => {
    if (!normalizedSearchQuery) return familySource;
    return familySource.filter((family) => familyMatchesQuery(family, normalizedSearchQuery));
  }, [familySource, normalizedSearchQuery]);
  const filteredVariants = useMemo(() => {
    if (!normalizedSearchQuery) return visibleChartVariants ?? [];
    return (visibleChartVariants ?? []).filter((variant) => variantMatchesQuery(variant, normalizedSearchQuery));
  }, [normalizedSearchQuery, visibleChartVariants]);
  const orderedVariants = useMemo(
    () =>
      [...filteredVariants].sort((left, right) => {
        const leftRecommended = recommendedIds.has(left.chartId) ? 1 : 0;
        const rightRecommended = recommendedIds.has(right.chartId) ? 1 : 0;
        if (leftRecommended !== rightRecommended) return rightRecommended - leftRecommended;
        return 0;
      }),
    [filteredVariants, recommendedIds]
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
            {showDescriptions ? (
              <p>
                {rendererSupport?.rendererSupported
                  ? "Only variants that the current Chart.js renderer can preview and save stay clickable."
                  : "This selection is not wired to the current Chart.js renderer yet. Pick one of the available variants below to continue."}
              </p>
            ) : null}
        </div>

        <div className="builder-chart-type-search-row">
          <label className="builder-chart-type-search-field">
            <span className="builder-query-label">Search chart type</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Find family or variant"
            />
          </label>
          {normalizedSearchQuery ? (
            <button
              type="button"
              className="builder-chart-type-search-clear"
              onClick={() => setSearchQuery("")}
            >
              Clear
            </button>
          ) : null}
        </div>

        <ChartTypeSelect
          families={normalizedSearchQuery ? filteredFamilies : familySource}
          selectedFamily={selectedChartFamily}
          selectedFamilyMeta={activeChartFamilyMeta}
          selectedCategory={activeCategoryMeta?.label ?? selectedChartCategory}
          showDescriptions={showDescriptions}
          onFamilyChange={onChartFamilyChange}
        />

        <div className="builder-chart-type-variant-panel">
          <div className="builder-chart-type-panel-head">
            <span className="builder-query-label">
              {normalizedSearchQuery ? "Matched variants" : "Available variants"}
            </span>
            <span className="builder-chart-inline-badge">
              {selectableVariantCount}/{orderedVariants.length || 0} ready
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
          {orderedVariants.length ? (
            <ChartVariantList
              variants={orderedVariants}
              selectedVariant={selectedChartVariant ?? activeChartVariantMeta?.id ?? chartType}
              showDescriptions={showDescriptions}
              onVariantSelect={onChartVariantChange}
            />
          ) : (
            <div className="builder-chart-type-empty">
              No chart variants matched this search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
