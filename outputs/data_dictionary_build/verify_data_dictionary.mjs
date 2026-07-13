import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const workbookPath = path.join(repoRoot, "data_dictionary.xlsx");
const expectedSheets = [
  "README",
  "Project Analysis",
  "Module List",
  "Table Overview",
  "Data Dictionary",
  "Relationships",
  "Indexes",
  "Constraints",
  "Status & Enum Values",
  "Suggested SQL DDL",
  "ERD Notes",
  "API Mapping Suggestions",
  "Future Expansion",
  "Open Questions",
  "Data Dictionary QA",
];

const blob = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(blob);
const sheetInspect = await workbook.inspect({ kind: "sheet", include: "name", maxChars: 8000 });
const tableInspect = await workbook.inspect({
  kind: "table",
  sheetId: "Data Dictionary",
  range: "A1:W80",
  tableMaxRows: 80,
  tableMaxCols: 23,
  maxChars: 60000,
});
const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300, matchFormulas: true },
  maxChars: 10000,
});

const sheetLines = sheetInspect.ndjson.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const sheetNames = sheetLines.filter((row) => row.kind === "sheet").map((row) => row.name);
const missingSheets = expectedSheets.filter((sheet) => !sheetNames.includes(sheet));
const unexpectedSheets = sheetNames.filter((sheet) => !expectedSheets.includes(sheet));
const formulaErrors = errorScan.ndjson
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((row) => row.kind === "match");
const summary = JSON.parse(await fs.readFile(path.join(__dirname, "data_dictionary_summary.json"), "utf8"));
const forbiddenTableNames = summary.forbiddenTables ?? [];

const verification = {
  workbookPath,
  exists: true,
  expectedSheets: expectedSheets.length,
  actualSheets: sheetNames.length,
  missingSheets,
  unexpectedSheets,
  formulaErrors: formulaErrors.length,
  forbiddenTableNameMatches: forbiddenTableNames.length,
  previewFiles: (await fs.readdir(path.join(__dirname, "previews"))).filter((name) => name.endsWith(".png")).length,
  summary,
  tableInspectPreviewLines: tableInspect.ndjson.split(/\r?\n/).filter(Boolean).length,
  passed: missingSheets.length === 0
    && unexpectedSheets.length === 0
    && formulaErrors.length === 0
    && forbiddenTableNames.length === 0
    && summary.criticalIssues === 0
    && summary.highIssues === 0
    && summary.forbiddenTables.length === 0,
};

await fs.writeFile(path.join(__dirname, "data_dictionary_verification.json"), JSON.stringify(verification, null, 2), "utf8");
console.log(JSON.stringify(verification, null, 2));
