function splitCsvLine(line = "", delimiter = ",") {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function detectDelimiter(text = "") {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: splitCsvLine(firstLine, delimiter).length }))
    .sort((left, right) => right.count - left.count)[0]?.delimiter ?? ",";
}

function normalizeColumnName(value, index) {
  const fallback = `column_${index + 1}`;
  return String(value || fallback)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase() || fallback;
}

function inferType(values = []) {
  const sample = values.filter((value) => value !== "" && value !== null && value !== undefined).slice(0, 50);
  if (!sample.length) return "text";
  const numberCount = sample.filter((value) => Number.isFinite(Number(String(value).replace(/,/g, "")))).length;
  if (numberCount / sample.length >= 0.85) return "number";
  const dateCount = sample.filter((value) => !Number.isNaN(Date.parse(value))).length;
  if (dateCount / sample.length >= 0.85) return "date";
  return "category";
}

function coerceValue(value, type) {
  if (value === "") return "";
  if (type === "number") {
    const normalized = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(normalized) ? normalized : value;
  }
  if (type === "date") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
  }
  return value;
}

export function parseCsvText(text = "") {
  const cleanText = String(text ?? "").replace(/^\uFEFF/, "");
  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) {
    return {
      headers: [],
      fields: [],
      rows: [],
      validation: { valid: false, errors: ["CSV file is empty."], warnings: [] },
    };
  }

  const delimiter = detectDelimiter(cleanText);
  const rawHeaders = splitCsvLine(lines[0], delimiter);
  const headers = rawHeaders.map(normalizeColumnName);
  const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index);
  const warnings = [];

  if (duplicateHeaders.length) {
    warnings.push(`Duplicate columns detected: ${Array.from(new Set(duplicateHeaders)).join(", ")}.`);
  }

  const rawRows = lines.slice(1).map((line) => splitCsvLine(line, delimiter));
  const columnValues = headers.map((_, columnIndex) => rawRows.map((row) => row[columnIndex] ?? ""));
  const fields = headers.map((name, index) => ({
    name,
    label: rawHeaders[index]?.trim() || name,
    type: inferType(columnValues[index]),
  }));

  const rows = rawRows.map((values, rowIndex) => {
    const row = { id: `csv-row-${rowIndex + 1}` };
    fields.forEach((field, columnIndex) => {
      row[field.name] = coerceValue(values[columnIndex] ?? "", field.type);
    });
    return row;
  });

  const errors = [];
  if (!headers.length) errors.push("No columns were detected.");
  if (!rows.length) warnings.push("CSV contains headers but no data rows.");

  return {
    delimiter,
    headers,
    fields,
    rows,
    validation: {
      valid: errors.length === 0,
      errors,
      warnings,
    },
  };
}

function parseCsvTextChunked(text = "") {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      try {
        resolve(parseCsvText(text));
      } catch (error) {
        reject(error);
      }
    }, 0);
  });
}

export function parseCsvTextAsync(text = "") {
  if (typeof Worker === "undefined") {
    return parseCsvTextChunked(text);
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./csvImport.worker.js", import.meta.url), { type: "module" });

    worker.onmessage = (event) => {
      worker.terminate();
      if (event.data?.ok) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data?.error || "Unable to parse CSV file."));
      }
    };

    worker.onerror = () => {
      worker.terminate();
      parseCsvTextChunked(text).then(resolve, reject);
    };

    worker.postMessage({ text });
  });
}

export function createDatasetFromCsv({ name, fileName, parsed }) {
  const safeName = String(name || fileName || "Imported CSV").replace(/\.[^.]+$/, "").trim() || "Imported CSV";
  const now = new Date().toISOString();
  return {
    id: `dataset-${Date.now()}`,
    name: safeName,
    source: fileName || "CSV upload",
    createdAt: now,
    updatedAt: now,
    fields: parsed.fields,
    rows: parsed.rows,
    rowCount: parsed.rows.length,
    columnCount: parsed.fields.length,
    validation: parsed.validation,
  };
}
