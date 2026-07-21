const MOJIBAKE_MARKERS = [
  "\u00c3",
  "\u00c2",
  "\u00ef\u00bf\u00bd",
  "\ufffd",
  "\u00e0\u00b8",
  "\u00e0\u00b9",
  "\u00e0\u00ba",
  "\u00e2\u20ac",
  "\u00e2\u2020",
  "\u00e2\u2014",
  "\u00ef\u00bc",
  "\u00c3\u2014",
  "\u00c3\u00d7",
  "\u00c2\u00b7",
];

const WINDOWS_1252_REVERSE = new Map([
  ["\u20ac", 0x80],
  ["\u201a", 0x82],
  ["\u0192", 0x83],
  ["\u201e", 0x84],
  ["\u2026", 0x85],
  ["\u2020", 0x86],
  ["\u2021", 0x87],
  ["\u02c6", 0x88],
  ["\u2030", 0x89],
  ["\u0160", 0x8a],
  ["\u2039", 0x8b],
  ["\u0152", 0x8c],
  ["\u017d", 0x8e],
  ["\u2018", 0x91],
  ["\u2019", 0x92],
  ["\u201c", 0x93],
  ["\u201d", 0x94],
  ["\u2022", 0x95],
  ["\u2013", 0x96],
  ["\u2014", 0x97],
  ["\u02dc", 0x98],
  ["\u2122", 0x99],
  ["\u0161", 0x9a],
  ["\u203a", 0x9b],
  ["\u0153", 0x9c],
  ["\u017e", 0x9e],
  ["\u0178", 0x9f],
]);

const TEXT_DECODER = new TextDecoder("utf-8", { fatal: false });

const DEFAULT_SKIP_KEYS = new Set([
  "id",
  "key",
  "path",
  "route",
  "to",
  "href",
  "url",
  "type",
  "role",
  "format",
  "source",
  "sourceType",
  "storageKey",
  "projectId",
  "dashboardId",
  "chartId",
  "datasetId",
  "fieldId",
  "sourceChartId",
  "sourceChartConfigId",
  "chartType",
]);

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function bytesFromMojibakeSegment(segment) {
  const bytes = [];
  for (const char of segment) {
    const code = char.codePointAt(0);
    if (typeof code !== "number") return null;
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = WINDOWS_1252_REVERSE.get(char);
    if (typeof mapped !== "number") return null;
    bytes.push(mapped);
  }
  return bytes.length ? Uint8Array.from(bytes) : null;
}

function decodeMojibakeRun(segment) {
  const bytes = bytesFromMojibakeSegment(segment);
  if (!bytes) return segment;
  const decoded = TEXT_DECODER.decode(bytes);
  return decoded.includes("\ufffd") ? segment : decoded;
}

function repairOnce(value) {
  let output = "";
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    output += decodeMojibakeRun(buffer);
    buffer = "";
  };

  for (const char of value) {
    const code = char.codePointAt(0);
    if ((typeof code === "number" && code >= 0x80 && code <= 0xff) || WINDOWS_1252_REVERSE.has(char)) {
      buffer += char;
    } else {
      flush();
      output += char;
    }
  }
  flush();
  return output;
}

export function isMojibakeText(value) {
  return typeof value === "string" && MOJIBAKE_MARKERS.some((marker) => value.includes(marker));
}

export function repairMojibakeText(value) {
  if (typeof value !== "string" || !isMojibakeText(value)) return value;
  let current = value;
  for (let index = 0; index < 4; index += 1) {
    const next = repairOnce(current);
    if (next === current) break;
    current = next;
    if (!isMojibakeText(current)) break;
  }
  return current;
}

export function repairObjectTextWithMeta(value, options = {}, path = []) {
  const skipKeys = options.skipKeys ?? DEFAULT_SKIP_KEYS;
  if (typeof value === "string") {
    const repaired = repairMojibakeText(value);
    return { value: repaired, repaired: repaired !== value };
  }

  if (Array.isArray(value)) {
    let repairedAny = false;
    const next = value.map((item, index) => {
      const result = repairObjectTextWithMeta(item, options, [...path, String(index)]);
      repairedAny = repairedAny || result.repaired;
      return result.value;
    });
    return { value: repairedAny ? next : value, repaired: repairedAny };
  }

  if (!isPlainObject(value)) return { value, repaired: false };

  let repairedAny = false;
  const next = {};
  Object.entries(value).forEach(([key, nestedValue]) => {
    if (skipKeys.has(key)) {
      next[key] = nestedValue;
      return;
    }
    const result = repairObjectTextWithMeta(nestedValue, options, [...path, key]);
    repairedAny = repairedAny || result.repaired;
    next[key] = result.value;
  });

  return { value: repairedAny ? next : value, repaired: repairedAny };
}

export function repairObjectText(value, options = {}) {
  return repairObjectTextWithMeta(value, options).value;
}

export { DEFAULT_SKIP_KEYS };
