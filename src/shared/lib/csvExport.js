const FORMULA_PREFIX_PATTERN = /^\s*[=+\-@]/;

export function neutralizeCsvFormula(value) {
  if (typeof value !== "string" || !FORMULA_PREFIX_PATTERN.test(value)) return value;
  return `'${value}`;
}

export function escapeCsvCell(value) {
  const safeValue = neutralizeCsvFormula(value ?? "");
  return `"${String(safeValue).replace(/"/g, '""')}"`;
}

export function buildCsv(rows, columns, { quoteHeaders = true } = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeColumns = Array.isArray(columns) ? columns : [];
  const header = safeColumns
    .map((column) => {
      const label = column?.label ?? column?.key ?? "";
      return quoteHeaders ? escapeCsvCell(label) : String(label);
    })
    .join(",");
  const body = safeRows.map((row) =>
    safeColumns.map((column) => escapeCsvCell(row?.[column?.key] ?? "")).join(","),
  );
  return [header, ...body].join("\n");
}
