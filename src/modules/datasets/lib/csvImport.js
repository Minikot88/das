export const CSV_IMPORT_LIMITS = Object.freeze({
  maxFileBytes: 5_000_000,
  maxRows: 50_000,
  maxColumns: 200,
});

function normalizedLimits(value = {}) {
  return {
    maxFileBytes: Number.isFinite(value.maxFileBytes) && value.maxFileBytes > 0
      ? Math.floor(value.maxFileBytes)
      : CSV_IMPORT_LIMITS.maxFileBytes,
    maxRows: Number.isFinite(value.maxRows) && value.maxRows > 0
      ? Math.floor(value.maxRows)
      : CSV_IMPORT_LIMITS.maxRows,
    maxColumns: Number.isFinite(value.maxColumns) && value.maxColumns > 0
      ? Math.floor(value.maxColumns)
      : CSV_IMPORT_LIMITS.maxColumns,
  };
}

function assertNotCancelled(signal) {
  if (signal?.aborted) throw new Error("CSV import was cancelled.");
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function delimiterCountInFirstRecord(text, delimiter) {
  let count = 0;
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (char === "\n" || char === "\r")) break;
    if (!inQuotes && char === delimiter) count += 1;
  }
  return count;
}

function detectDelimiter(text) {
  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: delimiterCountInFirstRecord(text, delimiter) }))
    .sort((left, right) => right.count - left.count)[0]?.delimiter ?? ",";
}

function parseRecords(text, delimiter, { signal, limits }) {
  const records = [];
  let record = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false;
  let recordHadDelimiter = false;

  function pushField() {
    record.push(field.trim());
    field = "";
    fieldStarted = false;
  }

  function pushRecord() {
    pushField();
    const blankPhysicalLine = !recordHadDelimiter && record.length === 1 && record[0] === "";
    if (!blankPhysicalLine) {
      records.push(record);
      if (records.length > limits.maxRows + 1) {
        throw new Error(`CSV contains more than ${limits.maxRows} data row${limits.maxRows === 1 ? "" : "s"}.`);
      }
    }
    record = [];
    recordHadDelimiter = false;
  }

  for (let index = 0; index < text.length; index += 1) {
    if (index % 4096 === 0) assertNotCancelled(signal);
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
        fieldStarted = true;
        continue;
      }
      if (inQuotes) {
        inQuotes = false;
        continue;
      }
      if (!fieldStarted || field.trim() === "") {
        inQuotes = true;
        fieldStarted = true;
        continue;
      }
      field += char;
      fieldStarted = true;
      continue;
    }

    if (!inQuotes && char === delimiter) {
      pushField();
      recordHadDelimiter = true;
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      pushRecord();
      continue;
    }

    if (inQuotes && char === "\r") {
      if (next === "\n") index += 1;
      field += "\n";
      fieldStarted = true;
      continue;
    }

    field += char;
    fieldStarted = true;
  }

  assertNotCancelled(signal);
  if (inQuotes) throw new Error("CSV contains an unterminated quoted field.");
  if (fieldStarted || record.length || recordHadDelimiter) pushRecord();
  return records;
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

function uniqueHeaders(rawHeaders) {
  const reserved = new Set(rawHeaders.map((header, index) => normalizeColumnName(header, index)));
  const used = new Set();
  const renames = [];
  const headers = rawHeaders.map((header, index) => {
    const base = normalizeColumnName(header, index);
    if (!used.has(base)) {
      used.add(base);
      return base;
    }
    let suffix = 2;
    let renamed = `${base}_${suffix}`;
    while (used.has(renamed) || reserved.has(renamed)) {
      suffix += 1;
      renamed = `${base}_${suffix}`;
    }
    used.add(renamed);
    renames.push(`${base} → ${renamed}`);
    return renamed;
  });
  return { headers, renames };
}

function inferType(values = []) {
  const sample = values.filter((value) => value !== "" && value !== null && value !== undefined).slice(0, 50);
  if (!sample.length) return "text";
  const booleanCount = sample.filter((value) => /^(?:true|false|yes|no)$/i.test(String(value))).length;
  if (booleanCount === sample.length) return "boolean";
  const numberCount = sample.filter((value) => Number.isFinite(Number(String(value).replace(/,/g, "")))).length;
  if (numberCount / sample.length >= 0.85) return "number";
  const dateCount = sample.filter((value) => !Number.isNaN(Date.parse(String(value)))).length;
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
  if (type === "boolean") return /^(?:true|yes)$/i.test(String(value));
  return value;
}

function stableHash(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function validateCsvFile(file, options = {}) {
  const limits = normalizedLimits(options.limits);
  if (!file || typeof file.size !== "number") throw new Error("Select a CSV file to import.");
  if (file.size > limits.maxFileBytes) {
    throw new Error(`CSV file exceeds the ${limits.maxFileBytes} byte limit.`);
  }
  return true;
}

export function parseCsvText(text = "", options = {}) {
  const limits = normalizedLimits(options.limits);
  assertNotCancelled(options.signal);
  const cleanText = String(text ?? "").replace(/^\uFEFF/, "");
  const size = byteLength(cleanText);
  if (size > limits.maxFileBytes) {
    throw new Error(`CSV file exceeds the ${limits.maxFileBytes} byte limit.`);
  }
  if (!cleanText.trim()) {
    return {
      headers: [],
      fields: [],
      rows: [],
      validation: { valid: false, errors: ["CSV file is empty."], warnings: [] },
    };
  }

  const delimiter = detectDelimiter(cleanText);
  const records = parseRecords(cleanText, delimiter, { signal: options.signal, limits });
  if (!records.length) {
    return {
      delimiter,
      headers: [],
      fields: [],
      rows: [],
      validation: { valid: false, errors: ["CSV file is empty."], warnings: [] },
    };
  }

  const rawHeaders = records[0];
  if (rawHeaders.length > limits.maxColumns) {
    throw new Error(`CSV contains ${rawHeaders.length} columns; the limit is ${limits.maxColumns}.`);
  }
  const { headers, renames } = uniqueHeaders(rawHeaders);
  const rawRows = records.slice(1);
  const errors = rawRows.flatMap((row, index) => row.length === headers.length
    ? []
    : [`Record ${index + 2} has ${row.length} column${row.length === 1 ? "" : "s"}; expected ${headers.length}.`]
  );
  const warnings = renames.length
    ? [`Duplicate column names were renamed: ${renames.join(", ")}.`]
    : [];
  if (!rawRows.length) warnings.push("CSV contains headers but no data rows.");

  const columnValues = headers.map((_, columnIndex) => rawRows.map((row) => row[columnIndex] ?? ""));
  const fields = headers.map((name, index) => ({
    id: name,
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

function parseCsvTextChunked(text = "", options = {}) {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      try {
        resolve(parseCsvText(text, options));
      } catch (error) {
        reject(error);
      }
    }, 0);
  });
}

export function parseCsvTextAsync(text = "", options = {}) {
  if (options.signal?.aborted) return Promise.reject(new Error("CSV import was cancelled."));
  if (typeof Worker === "undefined") return parseCsvTextChunked(text, options);

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./csvImport.worker.js", import.meta.url), { type: "module" });
    const abort = () => {
      worker.terminate();
      reject(new Error("CSV import was cancelled."));
    };
    options.signal?.addEventListener?.("abort", abort, { once: true });

    worker.onmessage = (event) => {
      options.signal?.removeEventListener?.("abort", abort);
      worker.terminate();
      if (event.data?.ok) resolve(event.data.result);
      else reject(new Error(event.data?.error || "Unable to parse CSV file."));
    };
    worker.onerror = () => {
      options.signal?.removeEventListener?.("abort", abort);
      worker.terminate();
      parseCsvTextChunked(text, options).then(resolve, reject);
    };
    worker.postMessage({ text, options: { limits: normalizedLimits(options.limits) } });
  });
}

export function createDatasetFromCsv({ name, fileName, parsed, projectId = null, id = null }) {
  const safeName = String(name || fileName || "Imported CSV").replace(/\.[^.]+$/, "").trim() || "Imported CSV";
  const fingerprint = stableHash(JSON.stringify({
    safeName,
    fileName: fileName || "",
    delimiter: parsed?.delimiter ?? ",",
    headers: parsed?.headers ?? [],
    rows: parsed?.rows ?? [],
  }));
  const now = new Date().toISOString();
  return {
    id: id || `dataset-csv-${fingerprint}`,
    ...(projectId ? { projectId } : {}),
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
