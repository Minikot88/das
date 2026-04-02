import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "../../store/useStore";
import { datasets, schema } from "../../data/mockData";

function areFiltersEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function collectDatasetMetadata(charts) {
  const datasetNames = [...new Set(charts.map((chart) => chart.dataset).filter(Boolean))];
  const categoryFields = new Map();
  const dateFields = new Set();

  for (const datasetName of datasetNames) {
    const tableSchema = Object.values(schema)
      .flatMap((dbTables) => Object.entries(dbTables))
      .find(([tableName]) => tableName === datasetName)?.[1];

    const fields = tableSchema?.fields ?? [];
    const rows = datasets[datasetName] ?? [];

    for (const field of fields) {
      if (field.type === "date") {
        dateFields.add(field.name);
      }

      if (field.type !== "string") continue;

      if (!categoryFields.has(field.name)) {
        categoryFields.set(field.name, new Set());
      }

      for (const row of rows) {
        const value = row[field.name];
        if (value !== null && value !== undefined && value !== "") {
          categoryFields.get(field.name).add(String(value));
        }
      }
    }
  }

  return {
    dateFields: [...dateFields].sort(),
    categoryFields: [...categoryFields.keys()].sort(),
    categoryValuesByField: Object.fromEntries(
      [...categoryFields.entries()].map(([field, values]) => [field, [...values].sort((a, b) => a.localeCompare(b))])
    ),
  };
}

function describePreset(filters) {
  const parts = [];

  if (filters.aggregateType) parts.push(String(filters.aggregateType).toUpperCase());
  if (filters.dateField) parts.push(`Date: ${filters.dateField}`);
  if (filters.dateRange?.start || filters.dateRange?.end) {
    parts.push(`Range: ${filters.dateRange?.start || "Any"} to ${filters.dateRange?.end || "Any"}`);
  }
  if (filters.categoryField) {
    parts.push(
      filters.categoryValue
        ? `${filters.categoryField} = ${filters.categoryValue}`
        : `Category: ${filters.categoryField}`
    );
  }

  return parts.join(" / ") || "Base dashboard filters";
}

export default function DashboardFiltersPanel({ dashboardId, charts, filters, onApply, onReset }) {
  const [draft, setDraft] = useState(filters);
  const [presetName, setPresetName] = useState("");
  const [presetFeedback, setPresetFeedback] = useState("");
  const filterPresets = useStore((state) => state.filterPresets);
  const saveFilterPreset = useStore((state) => state.saveFilterPreset);
  const applyFilterPreset = useStore((state) => state.applyFilterPreset);
  const deleteFilterPreset = useStore((state) => state.deleteFilterPreset);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!areFiltersEqual(draft, filters)) {
        onApply(draft);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [draft, filters, onApply]);

  const metadata = useMemo(() => collectDatasetMetadata(charts), [charts]);
  const presets = useMemo(
    () => filterPresets.filter((preset) => preset.dashboardId === dashboardId),
    [dashboardId, filterPresets]
  );
  const activePresetId = useMemo(
    () => presets.find((preset) => areFiltersEqual(preset.filters, filters))?.id ?? null,
    [filters, presets]
  );
  const categoryValues = draft.categoryField
    ? metadata.categoryValuesByField[draft.categoryField] ?? []
    : [];

  const activeFilters = [
    draft.aggregateType ? { key: "aggregate", label: `Aggregate: ${String(draft.aggregateType).toUpperCase()}` } : null,
    draft.dateField ? { key: "dateField", label: `Date field: ${draft.dateField}` } : null,
    draft.dateRange?.start ? { key: "dateStart", label: `From: ${draft.dateRange.start}` } : null,
    draft.dateRange?.end ? { key: "dateEnd", label: `To: ${draft.dateRange.end}` } : null,
    draft.categoryField ? { key: "categoryField", label: `Category: ${draft.categoryField}` } : null,
    draft.categoryValue ? { key: "categoryValue", label: `Value: ${draft.categoryValue}` } : null,
  ].filter(Boolean);
  const filterSummary = [
    { label: "Datasets", value: [...new Set(charts.map((chart) => chart.dataset).filter(Boolean))].length },
    { label: "Presets", value: presets.length },
    { label: "Active filters", value: activeFilters.length },
  ];

  function clearFilter(key) {
    setDraft((prev) => {
      if (key === "aggregate") return { ...prev, aggregateType: "sum" };
      if (key === "dateField") return { ...prev, dateField: "" };
      if (key === "dateStart") return { ...prev, dateRange: { ...prev.dateRange, start: "" } };
      if (key === "dateEnd") return { ...prev, dateRange: { ...prev.dateRange, end: "" } };
      if (key === "categoryField") return { ...prev, categoryField: "", categoryValue: "" };
      if (key === "categoryValue") return { ...prev, categoryValue: "" };
      return prev;
    });
  }

  function handleReset() {
    const resetState = {
      ...filters,
      aggregateType: "sum",
      dateField: "",
      dateRange: { start: "", end: "" },
      categoryField: "",
      categoryValue: "",
    };
    setDraft(resetState);
    onReset();
  }

  function handleSavePreset() {
    const trimmedName = presetName.trim();
    if (!dashboardId || !trimmedName) {
      setPresetFeedback("Enter a preset name to save this filter set.");
      return;
    }

    const existingPreset = presets.find(
      (preset) => preset.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    saveFilterPreset(dashboardId, trimmedName, draft);
    setPresetFeedback(existingPreset ? `Updated preset "${trimmedName}".` : `Saved preset "${trimmedName}".`);
    setPresetName("");
  }

  function handleApplyPreset(preset) {
    setDraft(preset.filters);
    applyFilterPreset(preset.id);
    setPresetFeedback(`Applied preset "${preset.name}".`);
  }

  function handleDeletePreset(presetId, presetLabel) {
    deleteFilterPreset(presetId);
    setPresetFeedback(`Deleted preset "${presetLabel}".`);
  }

  return (
    <section className="dashboard-filter-panel" aria-label="Dashboard filters">
      <div className="dashboard-filter-header">
        <div className="dashboard-filter-heading">
          <div className="filter-panel-kicker">Global Filters</div>
          <h3 className="filter-panel-title">Control the whole board from one filter surface</h3>
          <p className="dashboard-filter-header-note">
            Apply one disciplined set of filters across every widget, then save the combinations your team reuses most.
          </p>
        </div>
        <div className="dashboard-filter-header-actions">
          <div className="dashboard-filter-summary-strip">
            {filterSummary.map((item) => (
              <div key={item.label} className="dashboard-filter-summary-chip">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <button type="button" className="add-chart-btn secondary filter-reset-btn" onClick={handleReset}>
            Reset Filters
          </button>
        </div>
      </div>

      <div className="dashboard-filter-presets">
        <div className="dashboard-filter-presets-header">
          <div>
            <div className="filter-panel-mini">Saved Presets</div>
            <p className="dashboard-filter-presets-sub">
              Save this dashboard&apos;s current filters and re-apply them in one click.
            </p>
          </div>
          {activePresetId ? <span className="dashboard-filter-preset-badge">Preset active</span> : null}
        </div>

        <div className="dashboard-filter-preset-save">
          <input
            type="text"
            className="filter-control"
            placeholder="Name this preset"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSavePreset();
              }
            }}
          />
          <button type="button" className="add-chart-btn secondary" onClick={handleSavePreset}>
            Save Preset
          </button>
        </div>

        {presetFeedback ? <p className="dashboard-filter-preset-feedback">{presetFeedback}</p> : null}

        {presets.length ? (
          <div className="dashboard-filter-preset-list">
            {presets.map((preset) => {
              const isActive = preset.id === activePresetId;

              return (
                <div key={preset.id} className={`dashboard-filter-preset-card${isActive ? " active" : ""}`}>
                  <button
                    type="button"
                    className="dashboard-filter-preset-main"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <strong>{preset.name}</strong>
                    <span>{describePreset(preset.filters)}</span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-filter-preset-delete"
                    onClick={() => handleDeletePreset(preset.id, preset.name)}
                    aria-label={`Delete ${preset.name} preset`}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="dashboard-filter-preset-empty">
            No presets yet. Save a common date and category combination to reuse it later.
          </div>
        )}
      </div>

      <div className="dashboard-filter-input-shell">
        <div className="dashboard-filter-input-head">
          <span className="filter-panel-mini">Filter controls</span>
          <span className="dashboard-filter-input-note">Six shared controls for aggregate, time, and category slicing.</span>
        </div>

        <div className="dashboard-filters">
          <div className="filter-group dashboard-filter-card">
            <label className="filter-label" htmlFor="dashboard-aggregate">
              Aggregate
            </label>
            <select
              id="dashboard-aggregate"
              className="filter-control"
              value={draft.aggregateType}
              onChange={(e) => setDraft((prev) => ({ ...prev, aggregateType: e.target.value }))}
            >
              <option value="sum">Sum</option>
              <option value="count">Count</option>
              <option value="avg">Average</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
            </select>
          </div>

          <div className="filter-group dashboard-filter-card">
            <label className="filter-label" htmlFor="dashboard-date-field">
              Date field
            </label>
            <select
              id="dashboard-date-field"
              className="filter-control"
              value={draft.dateField ?? ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateField: e.target.value }))}
            >
              <option value="">Auto detect</option>
              {metadata.dateFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group dashboard-filter-card">
            <label className="filter-label" htmlFor="dashboard-date-start">
              From
            </label>
            <input
              id="dashboard-date-start"
              className="filter-control"
              type="month"
              value={draft.dateRange?.start ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value },
                }))
              }
            />
          </div>

          <div className="filter-group dashboard-filter-card">
            <label className="filter-label" htmlFor="dashboard-date-end">
              To
            </label>
            <input
              id="dashboard-date-end"
              className="filter-control"
              type="month"
              value={draft.dateRange?.end ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value },
                }))
              }
            />
          </div>

          <div className="filter-group dashboard-filter-card">
            <label className="filter-label" htmlFor="dashboard-category-field">
              Category field
            </label>
            <select
              id="dashboard-category-field"
              className="filter-control"
              value={draft.categoryField ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  categoryField: e.target.value,
                  categoryValue: "",
                }))
              }
            >
              <option value="">All fields</option>
              {metadata.categoryFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group dashboard-filter-card">
            <label className="filter-label" htmlFor="dashboard-category-value">
              Category value
            </label>
            <select
              id="dashboard-category-value"
              className="filter-control"
              value={draft.categoryValue ?? ""}
              disabled={!draft.categoryField}
              onChange={(e) => setDraft((prev) => ({ ...prev, categoryValue: e.target.value }))}
            >
              <option value="">All values</option>
              {categoryValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="dashboard-active-filters" aria-live="polite">
        <span className="active-filters-label">Active Filters</span>
        <div className="active-filter-list">
          {activeFilters.length ? (
            activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className="active-filter-pill"
                onClick={() => clearFilter(filter.key)}
                title={`Clear ${filter.label}`}
              >
                <span>{filter.label}</span>
                <strong>x</strong>
              </button>
            ))
          ) : (
            <span className="active-filter-empty">No active filters</span>
          )}
        </div>
      </div>
    </section>
  );
}
