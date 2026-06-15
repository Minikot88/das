const DEFAULT_FILTERS = {
  dateRange: "All dates",
  department: "All departments",
  region: "All regions",
  year: "All years",
};

const DEPARTMENT_FIELD_CANDIDATES = ["department", "category", "segment", "channel"];
const REGION_FIELD_CANDIDATES = ["region", "market", "country", "territory"];
const YEAR_FIELD_CANDIDATES = ["year"];
const DATE_FIELD_CANDIDATES = ["date", "createdAt", "orderDate"];
const DRILLDOWN_HIERARCHIES = [
  ["year", "quarter", "month", "date"],
  ["category", "subcategory", "product"],
];

function firstAvailableField(row = {}, candidates = []) {
  return candidates.find((candidate) => Object.prototype.hasOwnProperty.call(row, candidate)) ?? "";
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getDateRangeStart(range, anchorDate = new Date()) {
  const value = String(range ?? "");
  const now = anchorDate;
  if (value === "Last 7 days") return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
  if (value === "Last 14 days") return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 14));
  if (value === "Last 30 days") return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30));
  if (value === "Last 90 days") return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 90));
  if (value === "Current quarter") {
    const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
    return new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1));
  }
  if (value === "Year to date") return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  if (value === "Last year") return new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
  return null;
}

function rowMatchesDateRange(row, range, anchorDate) {
  if (!range || range === DEFAULT_FILTERS.dateRange) return true;
  const field = firstAvailableField(row, DATE_FIELD_CANDIDATES);
  if (!field) return true;
  const rowDate = new Date(row[field]);
  const start = getDateRangeStart(range, anchorDate);
  if (!start || Number.isNaN(rowDate.getTime())) return true;
  return rowDate >= start;
}

function rowMatchesField(row, filters, key, defaultValue, candidates) {
  const value = filters?.[key];
  if (!value || value === defaultValue) return true;
  const field = firstAvailableField(row, candidates);
  if (!field) return true;
  return normalize(row[field]) === normalize(value);
}

function rowMatchesInteraction(row, interaction) {
  if (!interaction?.field || interaction.value === undefined || interaction.value === null || interaction.value === "") return true;
  if (!Object.prototype.hasOwnProperty.call(row, interaction.field)) return true;
  return normalize(row[interaction.field]) === normalize(interaction.value);
}

function applyInteractions(rows = [], interactions = {}) {
  const crossFilter = interactions.crossFilter;
  const drilldown = interactions.drilldown;
  const drillFilters = Array.isArray(drilldown?.path) ? drilldown.path : [];
  return rows.filter((row) =>
    rowMatchesInteraction(row, crossFilter) &&
    drillFilters.every((step) => rowMatchesInteraction(row, step))
  );
}

export function isDashboardFilterActive(filters = {}) {
  return Object.entries(DEFAULT_FILTERS).some(([key, value]) => (filters[key] || value) !== value);
}

export function getActiveDashboardFilterChips(filters = {}) {
  return Object.entries(DEFAULT_FILTERS)
    .filter(([key, value]) => (filters[key] || value) !== value)
    .map(([key]) => ({ key, label: key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()), value: filters[key] }));
}

export function getInteractionChips(interactions = {}) {
  const chips = [];
  if (interactions.crossFilter?.field) {
    chips.push({
      key: "cross-filter",
      label: "Cross filter",
      value: `${interactions.crossFilter.field}: ${interactions.crossFilter.value}`,
    });
  }
  if (Array.isArray(interactions.drilldown?.path)) {
    interactions.drilldown.path.forEach((step, index) => {
      chips.push({
        key: `drilldown-${index}`,
        label: "Drilldown",
        value: `${step.field}: ${step.value}`,
      });
    });
  }
  return chips;
}

export function resolveInteractionPoint(chart = {}, point = {}) {
  const rows = Array.isArray(chart.rows) ? chart.rows : Array.isArray(chart.data) ? chart.data : [];
  const label = point.label ?? "";
  if (!rows.length || label === "") return null;
  const mapping = chart.mapping ?? chart.config?.mapping ?? {};
  const candidates = [
    mapping.x,
    mapping.label,
    mapping.category,
    mapping.series,
    "year",
    "quarter",
    "month",
    "date",
    "category",
    "subcategory",
    "product",
    "region",
    "segment",
    "channel",
  ].flatMap((value) => Array.isArray(value) ? value : value ? [value] : []);
  const field = candidates.find((candidate) =>
    rows.some((row) => normalize(row?.[candidate]) === normalize(label))
  );
  if (!field) return null;
  return {
    field,
    value: rows.find((row) => normalize(row?.[field]) === normalize(label))?.[field] ?? label,
  };
}

export function getNextDrilldownStep(currentPath = [], point = null) {
  if (!point?.field) return null;
  const hierarchy = DRILLDOWN_HIERARCHIES.find((items) => items.includes(point.field));
  if (!hierarchy) return point;
  const currentIndex = hierarchy.indexOf(point.field);
  const expectedField = hierarchy[Math.min(currentPath.length, hierarchy.length - 1)];
  if (currentPath.length === 0 && point.field !== hierarchy[0]) return point;
  if (point.field !== expectedField && currentIndex !== currentPath.length) return null;
  return point;
}

export function filterDashboardRows(rows = [], filters = {}) {
  if (!Array.isArray(rows) || !rows.length) return [];
  if (!isDashboardFilterActive(filters)) return rows;
  const dateField = firstAvailableField(rows[0], DATE_FIELD_CANDIDATES);
  const anchorDate = dateField
    ? rows.reduce((latest, row) => {
        const date = new Date(row?.[dateField]);
        return Number.isNaN(date.getTime()) || date <= latest ? latest : date;
      }, new Date(0))
    : new Date();

  return rows.filter((row) =>
    rowMatchesDateRange(row, filters.dateRange, anchorDate) &&
    rowMatchesField(row, filters, "department", DEFAULT_FILTERS.department, DEPARTMENT_FIELD_CANDIDATES) &&
    rowMatchesField(row, filters, "region", DEFAULT_FILTERS.region, REGION_FIELD_CANDIDATES) &&
    rowMatchesField(row, filters, "year", DEFAULT_FILTERS.year, YEAR_FIELD_CANDIDATES)
  );
}

export function applyDashboardFiltersToWidget(widget, filters, interactions = {}) {
  const sourceRows = Array.isArray(widget.rows)
    ? widget.rows
    : Array.isArray(widget.data)
      ? widget.data
      : Array.isArray(widget.config?.rows)
        ? widget.config.rows
        : [];
  const dashboardRows = filterDashboardRows(sourceRows, filters);
  const rows = applyInteractions(dashboardRows, interactions);
  return {
    ...widget,
    rows,
    data: rows,
    config: {
      ...(widget.config ?? {}),
      rows,
      queryResult: widget.config?.queryResult
        ? {
            ...widget.config.queryResult,
            rows,
            rowCount: rows.length,
          }
        : widget.config?.queryResult,
    },
    filterMeta: {
      active: isDashboardFilterActive(filters),
      sourceRowCount: sourceRows.length,
      dashboardFilteredRowCount: dashboardRows.length,
      filteredRowCount: rows.length,
    },
  };
}
