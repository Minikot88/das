import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { PageContainer, PageHeader } from "@app/layouts/Layout";
import { useStore } from "@app/store/useStore";
import {
  API_ACTIVE_PROJECT_KEY,
  getProjects,
  resolveApiActiveProject,
} from "@modules/projects";
import { parseCsvTextAsync, validateCsvFile } from "@modules/datasets/lib/csvImport";
import {
  createExternalDataset,
  importDatasetCsv,
  listExternalColumns,
  listExternalMetadata,
  listExternalSources,
  listExternalTables,
  previewExternalSource,
} from "@modules/datasets/api/datasetApi";

const EMPTY_TABLES = [];
const EMPTY_METADATA = { constraints: [], foreignKeys: [], indexes: [] };
const PAGE_SIZE = 50;
const TABS = [
  { id: "data", label: "Data" },
  { id: "columns", label: "Columns" },
  { id: "constraints", label: "Constraints" },
  { id: "foreignKeys", label: "Foreign Keys" },
  { id: "indexes", label: "Indexes" },
];

function formatRowEstimate(value, prefix = false) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return "ไม่ทราบจำนวนแถว";
  return `${prefix ? "ประมาณ " : ""}${count.toLocaleString("th-TH")} แถว`;
}

function tableKey(schemaName, tableName) {
  return `${schemaName}.${tableName}`;
}

function Toggle({ open }) {
  return <span className="db-tree-toggle" aria-hidden="true">{open ? "⌄" : "›"}</span>;
}

function TypeMark({ type }) {
  const value = String(type || "").toLowerCase();
  const mark = /(int|numeric|decimal|real|double|money)/.test(value)
    ? "123"
    : /(date|time)/.test(value)
      ? "▣"
      : /(bool)/.test(value)
        ? "◉"
        : "A";
  return <span className="db-type-mark" aria-hidden="true">{mark}</span>;
}

function EmptyMetadata({ children }) {
  return <div className="db-metadata-empty">{children}</div>;
}

function MetadataTable({ columns, rows, empty }) {
  if (!rows.length) return <EmptyMetadata>{empty}</EmptyMetadata>;
  return (
    <div className="db-metadata-table-wrap">
      <table className="db-metadata-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.name || row.columnName || index}>
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : String(row[column.key] ?? "—")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ObjectExplorer({
  sources,
  catalog,
  columns,
  selectedSchema,
  selectedTable,
  search,
  onSearch,
  expanded,
  onToggle,
  onSelectTable,
  onToggleField,
  selectedFields,
  open,
  onClose,
}) {
  const normalizedSearch = search.trim().toLowerCase();

  return (
    <aside className={`db-object-explorer${open ? " is-open" : ""}`}>
      <header className="db-object-explorer__head">
        <div>
          <strong>Object Explorer</strong>
          <span>PostgreSQL objects</span>
        </div>
        <button type="button" className="db-icon-button db-explorer-close" onClick={onClose} aria-label="ปิด Object Explorer">×</button>
      </header>
      <label className="db-explorer-search">
        <span className="sr-only">ค้นหา Object Explorer</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="ค้นหา schema, table หรือ field"
        />
      </label>
      <div className="db-tree-scroll" role="tree" aria-label="Object Explorer">
        <button type="button" className="db-tree-row level-0" onClick={() => onToggle("connection")} aria-expanded={expanded.has("connection")}>
          <Toggle open={expanded.has("connection")} /><span className="db-tree-icon">◉</span><strong>Application PostgreSQL</strong>
        </button>
        {expanded.has("connection") ? (
          <>
            <button type="button" className="db-tree-row level-1" onClick={() => onToggle("database")} aria-expanded={expanded.has("database")}>
              <Toggle open={expanded.has("database")} /><span className="db-tree-icon">▱</span><strong>PostgreSQL</strong>
            </button>
            {expanded.has("database") ? sources.map((source) => {
              const schemaId = `schema:${source.schemaName}`;
              const tablesId = `tables:${source.schemaName}`;
              const filteredTables = (catalog[source.schemaName] ?? []).filter((table) => {
                if (!normalizedSearch) return true;
                if (`${source.schemaName}.${table.name}`.toLowerCase().includes(normalizedSearch)) return true;
                return source.schemaName === selectedSchema
                  && table.name === selectedTable
                  && columns.some((column) => `${column.name} ${column.dataType}`.toLowerCase().includes(normalizedSearch));
              });
              if (normalizedSearch && !filteredTables.length && !source.schemaName.toLowerCase().includes(normalizedSearch)) return null;
              return (
                <div key={source.schemaName} role="treeitem" aria-label={source.schemaName}>
                  <button type="button" className="db-tree-row level-2" onClick={() => onToggle(schemaId)} aria-expanded={expanded.has(schemaId)}>
                    <Toggle open={expanded.has(schemaId)} /><span className="db-tree-icon">◇</span><strong>{source.displayName || source.schemaName}</strong>
                  </button>
                  {expanded.has(schemaId) ? (
                    <>
                      <button type="button" className="db-tree-row level-3" onClick={() => onToggle(tablesId)} aria-expanded={expanded.has(tablesId)}>
                        <Toggle open={expanded.has(tablesId)} /><span className="db-tree-icon">▦</span><span>Tables</span><small>{filteredTables.length}</small>
                      </button>
                      {expanded.has(tablesId) ? filteredTables.map((table) => {
                        const active = source.schemaName === selectedSchema && table.name === selectedTable;
                        const currentTableId = `table:${tableKey(source.schemaName, table.name)}`;
                        return (
                          <div key={table.name}>
                            <button
                              type="button"
                              className={`db-tree-row level-4${active ? " is-active" : ""}`}
                              aria-current={active ? "true" : undefined}
                              aria-expanded={active ? expanded.has(currentTableId) : undefined}
                              aria-label={table.name}
                              onClick={() => {
                                onSelectTable(source.schemaName, table.name);
                                if (active) onToggle(currentTableId);
                              }}
                            >
                              <Toggle open={active && expanded.has(currentTableId)} /><span className="db-tree-icon">▤</span><span>{table.name}</span>
                              <small>{Number(table.rowCountEstimate) >= 0 ? Number(table.rowCountEstimate).toLocaleString("th-TH") : "ไม่ทราบจำนวนแถว"}</small>
                            </button>
                            {active && expanded.has(currentTableId) ? (
                              <div role="group">
                                <button
                                  type="button"
                                  className="db-tree-row level-5"
                                  onClick={() => onToggle(`columns:${currentTableId}`)}
                                  aria-expanded={expanded.has(`columns:${currentTableId}`)}
                                >
                                  <Toggle open={expanded.has(`columns:${currentTableId}`)} />
                                  <span className="db-tree-icon">⌘</span>
                                  <span>Columns</span>
                                  <small>{columns.length}</small>
                                </button>
                                {expanded.has(`columns:${currentTableId}`) ? columns.map((column) => (
                                  <label className="db-tree-column level-6" key={column.name}>
                                    <input
                                      type="checkbox"
                                      checked={selectedFields.includes(column.name)}
                                      onChange={() => onToggleField(column.name)}
                                    />
                                    <TypeMark type={column.dataType} />
                                    <span>{column.name}</span>
                                    <small>{column.dataType}</small>
                                  </label>
                                )) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      }) : null}
                    </>
                  ) : null}
                </div>
              );
            }) : null}
          </>
        ) : null}
      </div>
    </aside>
  );
}

function DataGrid({ rows, columns, sortField, sortDirection, onSort }) {
  return (
    <div className="db-data-grid-wrap">
      <table className="db-data-grid">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.name} aria-sort={sortField === column.name ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" onClick={() => onSort(column.name)}>
                  <span>{column.name}</span>
                  <small>{column.dataType}{column.primaryKey ? " · PK" : ""}</small>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={row.id ?? rowIndex}>
              {columns.map((column) => {
                const value = row?.[column.name];
                return <td key={column.name} title={value == null ? "" : String(value)}>{value === null || value === undefined || value === "" ? "—" : String(value)}</td>;
              })}
            </tr>
          )) : (
            <tr><td colSpan={Math.max(columns.length, 1)}><div className="db-data-empty">ไม่พบข้อมูลในเงื่อนไขปัจจุบัน</div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function DatasetsPage() {
  const navigate = useNavigate();
  const storeActiveProjectId = useStore((state) => state.activeProjectId);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [sources, setSources] = useState([]);
  const [catalog, setCatalog] = useState({});
  const [schemaName, setSchemaName] = useState("");
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState([]);
  const [metadata, setMetadata] = useState(EMPTY_METADATA);
  const [preview, setPreview] = useState({ rows: [], truncated: false });
  const [selectedFields, setSelectedFields] = useState([]);
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("data");
  const [explorerSearch, setExplorerSearch] = useState("");
  const [expanded, setExpanded] = useState(() => new Set(["connection", "database"]));
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatingChart, setCreatingChart] = useState(false);
  const creatingChartRef = useRef(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [parsedCsv, setParsedCsv] = useState(null);
  const [importingCsv, setImportingCsv] = useState(false);

  useEffect(() => {
    let active = true;
    getProjects().then((items) => {
      if (!active) return;
      const projects = Array.isArray(items) ? items : [];
      const selected = resolveApiActiveProject(
        projects,
        window.localStorage.getItem(API_ACTIVE_PROJECT_KEY),
        storeActiveProjectId,
      );
      if (!selected) {
        setError("ไม่พบโปรเจกต์สำหรับเปิดข้อมูล");
        setLoading(false);
        return;
      }
      window.localStorage.setItem(API_ACTIVE_PROJECT_KEY, selected.id);
      useStore.setState?.({ activeProjectId: selected.id });
      setActiveProjectId(selected.id);
    }).catch((requestError) => {
      if (active) {
        setError(requestError?.message || "ไม่สามารถโหลดโปรเจกต์ได้");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [storeActiveProjectId]);

  useEffect(() => {
    if (!activeProjectId) return undefined;
    let active = true;
    setLoading(true);
    listExternalSources(activeProjectId)
      .then(async (result) => {
        const nextSources = Array.isArray(result?.items) ? result.items : [];
        const entries = await Promise.all(nextSources.map(async (source) => [
          source.schemaName,
          (await listExternalTables(source.schemaName, activeProjectId))?.items ?? [],
        ]));
        if (!active) return;
        setSources(nextSources);
        setCatalog(Object.fromEntries(entries));
        setSchemaName((current) => nextSources.some((source) => source.schemaName === current) ? current : (nextSources[0]?.schemaName ?? ""));
        setError("");
        setExpanded((current) => {
          const next = new Set(current);
          nextSources.forEach((source) => {
            next.add(`schema:${source.schemaName}`);
            next.add(`tables:${source.schemaName}`);
          });
          return next;
        });
      })
      .catch((requestError) => { if (active) setError(requestError?.message || "ไม่สามารถโหลด schema และตารางได้"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeProjectId, refreshVersion]);

  const tables = useMemo(() => catalog[schemaName] ?? EMPTY_TABLES, [catalog, schemaName]);
  const selectedTableMetadata = useMemo(
    () => tables.find((table) => table.name === tableName) ?? null,
    [tableName, tables],
  );

  useEffect(() => {
    setTableName((current) => tables.some((table) => table.name === current) ? current : (tables[0]?.name ?? ""));
  }, [tables]);

  useEffect(() => {
    if (!activeProjectId || !schemaName || !tableName) return undefined;
    let active = true;
    setColumns([]);
    setMetadata(EMPTY_METADATA);
    setPreview({ rows: [], truncated: false });
    setPage(1);
    setFilterValue("");
    setLoading(true);
    Promise.all([
      listExternalColumns(schemaName, tableName, activeProjectId),
      listExternalMetadata(schemaName, tableName, activeProjectId),
    ]).then(([columnResult, metadataResult]) => {
      if (!active) return;
      const nextColumns = Array.isArray(columnResult?.items) ? columnResult.items : [];
      setColumns(nextColumns);
      setSelectedFields(nextColumns.map((column) => column.name));
      setFilterField(nextColumns[0]?.name ?? "");
      setSortField(nextColumns.find((column) => column.primaryKey)?.name ?? nextColumns[0]?.name ?? "");
      setMetadata({
        constraints: metadataResult?.constraints ?? [],
        foreignKeys: metadataResult?.foreignKeys ?? [],
        indexes: metadataResult?.indexes ?? [],
      });
      setExpanded((current) => {
        const next = new Set(current);
        const id = `table:${tableKey(schemaName, tableName)}`;
        next.add(id);
        next.add(`columns:${id}`);
        return next;
      });
      setError("");
    }).catch((requestError) => {
      if (active) setError(requestError?.message || "ไม่สามารถโหลดโครงสร้างตารางได้");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [activeProjectId, refreshVersion, schemaName, tableName]);

  useEffect(() => {
    if (!activeProjectId || !schemaName || !tableName || !selectedFields.length) return undefined;
    let active = true;
    setLoading(true);
    previewExternalSource({
      projectId: activeProjectId,
      schemaName,
      tableName,
      select: selectedFields,
      filters: filterValue && filterField ? [{ field: filterField, operator: "contains", value: filterValue }] : [],
      sort: sortField ? { field: sortField, direction: sortDirection } : undefined,
      page,
      pageSize: PAGE_SIZE,
    }).then((result) => {
      if (!active) return;
      setPreview({ rows: result?.rows ?? [], truncated: Boolean(result?.truncated) });
      setError("");
    }).catch((requestError) => {
      if (active) setError(requestError?.message || "ไม่สามารถโหลดข้อมูลตารางได้");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [activeProjectId, filterField, filterValue, page, refreshVersion, schemaName, selectedFields, sortDirection, sortField, tableName]);

  const selectTable = useCallback((nextSchema, nextTable) => {
    setSchemaName(nextSchema);
    setTableName(nextTable);
    setPage(1);
    setActiveTab("data");
    setExplorerOpen(false);
  }, []);

  const toggleExpanded = useCallback((id) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleField = useCallback((fieldName) => {
    setSelectedFields((current) => {
      if (current.includes(fieldName)) {
        return current.length === 1 ? current : current.filter((name) => name !== fieldName);
      }
      return columns.filter((column) => [...current, fieldName].includes(column.name)).map((column) => column.name);
    });
    setPage(1);
  }, [columns]);

  function handleSort(columnName) {
    setSortField((current) => {
      if (current === columnName) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
      else setSortDirection("asc");
      return columnName;
    });
    setPage(1);
  }

  async function createChart() {
    if (creatingChartRef.current || !activeProjectId || !schemaName || !tableName || !selectedFields.length) return;
    creatingChartRef.current = true;
    setCreatingChart(true);
    try {
      const dataset = await createExternalDataset({
        projectId: activeProjectId,
        name: `${schemaName}.${tableName}`,
        schemaName,
        tableName,
        selectedFields,
        filters: filterValue && filterField ? [{ field: filterField, operator: "contains", value: filterValue }] : [],
        sort: sortField ? { field: sortField, direction: sortDirection } : undefined,
      });
      navigate(`/dashboard-v2?projectId=${encodeURIComponent(activeProjectId)}&datasetId=${encodeURIComponent(dataset.id)}`);
    } catch (requestError) {
      setError(requestError?.message || "ไม่สามารถสร้างกราฟจากตารางนี้ได้");
    } finally {
      creatingChartRef.current = false;
      setCreatingChart(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setParsedCsv(null);
    setError("");
    if (!file) return;
    try {
      validateCsvFile(file);
      const parsed = await parseCsvTextAsync(await file.text());
      setFileName(file.name);
      setDatasetName(file.name.replace(/\.[^.]+$/, ""));
      setParsedCsv(parsed);
    } catch (parseError) {
      setError(parseError?.message || "ไม่สามารถอ่านไฟล์ CSV นี้ได้");
    }
  }

  async function importCsv() {
    if (!selectedFile || !parsedCsv?.validation?.valid || importingCsv) return;
    setImportingCsv(true);
    try {
      await importDatasetCsv({
        file: selectedFile,
        projectId: activeProjectId,
        name: datasetName,
        idempotencyKey: `dataset-import-${activeProjectId}-${selectedFile.name}-${selectedFile.size}`,
      });
      setSelectedFile(null);
      setParsedCsv(null);
      setFileName("");
      setDatasetName("");
      setError("");
    } catch (requestError) {
      setError(requestError?.message || "ไม่สามารถนำเข้าชุดข้อมูลได้");
    } finally {
      setImportingCsv(false);
    }
  }

  const visibleColumns = columns.filter((column) => selectedFields.includes(column.name));

  return (
    <PageContainer className="datasets-page db-browser-page">
      <PageHeader
        kicker="ข้อมูล"
        title="ชุดข้อมูล"
        subtitle="สำรวจโครงสร้างและเปิดดูข้อมูลจริงจาก PostgreSQL"
        actions={(
          <button type="button" className="dashboard-toolbar-btn" onClick={() => navigate("/connections")}>
            เชื่อมต่อฐานข้อมูล
          </button>
        )}
      />

      <details className="db-csv-import">
        <summary>นำเข้า CSV</summary>
        <div className="db-csv-import__body">
          <label className="dashboard-toolbar-btn datasets-file-picker" htmlFor="dataset-csv-input">เลือกไฟล์ CSV</label>
          <input id="dataset-csv-input" className="sr-only" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
          <span>{fileName || "ยังไม่ได้เลือกไฟล์"}</span>
          {parsedCsv ? (
            <>
              <label><span>ชื่อชุดข้อมูล</span><input value={datasetName} onChange={(event) => setDatasetName(event.target.value)} /></label>
              <span>{parsedCsv.rows.length.toLocaleString("th-TH")} แถว · {parsedCsv.fields.length} คอลัมน์</span>
              <button type="button" className="dashboard-toolbar-btn is-primary" disabled={!parsedCsv.validation.valid || importingCsv} onClick={importCsv}>
                {importingCsv ? "กำลังนำเข้า…" : "นำเข้า"}
              </button>
            </>
          ) : null}
        </div>
      </details>

      {error ? <div className="db-browser-alert" role="alert">{error}</div> : null}

      <section className="db-browser-workbench" aria-label="PostgreSQL data browser">
        <button type="button" className={`db-explorer-backdrop${explorerOpen ? " is-open" : ""}`} onClick={() => setExplorerOpen(false)} aria-label="ปิด Object Explorer" />
        <ObjectExplorer
          sources={sources}
          catalog={catalog}
          columns={columns}
          selectedSchema={schemaName}
          selectedTable={tableName}
          search={explorerSearch}
          onSearch={setExplorerSearch}
          expanded={expanded}
          onToggle={toggleExpanded}
          onSelectTable={selectTable}
          onToggleField={toggleField}
          selectedFields={selectedFields}
          open={explorerOpen}
          onClose={() => setExplorerOpen(false)}
        />

        <main className="db-table-workspace">
          <header className="db-table-workspace__head">
            <div className="db-table-context">
              <button type="button" className="db-mobile-explorer-button" onClick={() => setExplorerOpen(true)}>Object Explorer</button>
              <div className="db-breadcrumb" aria-label="Table context">
                <span>PostgreSQL</span><span>/</span><span>{schemaName || "…"}</span><span>/</span><strong>{tableName || "…"}</strong>
              </div>
              <div className="db-table-meta">
                <span>{selectedTableMetadata?.objectType || "table"}</span>
                <span>{formatRowEstimate(selectedTableMetadata?.rowCountEstimate, true)}</span>
                <span>อ่านอย่างเดียว</span>
              </div>
            </div>
            <div className="db-table-actions">
              <button type="button" className="dashboard-toolbar-btn" onClick={() => setRefreshVersion((value) => value + 1)} disabled={!tableName || loading}>
                {loading ? "กำลังโหลด…" : "รีเฟรช"}
              </button>
              <button type="button" className="dashboard-toolbar-btn is-primary" onClick={createChart} disabled={!tableName || !selectedFields.length || creatingChart}>
                {creatingChart ? "กำลังเปิด…" : "สร้างกราฟ"}
              </button>
            </div>
          </header>

          <div className="db-workspace-tabs" role="tablist" aria-label="รายละเอียดตาราง">
            {TABS.map((tab) => (
              <button
                type="button"
                role="tab"
                key={tab.id}
                aria-label={tab.label}
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? "is-active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.id !== "data" ? <small>{tab.id === "columns" ? columns.length : metadata[tab.id]?.length ?? 0}</small> : null}
              </button>
            ))}
          </div>

          {activeTab === "data" ? (
            <section className="db-data-panel" role="tabpanel" aria-label="Data">
              <div className="db-data-toolbar">
                <label>
                  <span>คอลัมน์สำหรับค้นหา</span>
                  <select aria-label="คอลัมน์สำหรับค้นหา" value={filterField} onChange={(event) => { setFilterField(event.target.value); setPage(1); }}>
                    {columns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
                  </select>
                </label>
                <label className="db-filter-value">
                  <span>ค้นหาในข้อมูล</span>
                  <input type="search" value={filterValue} onChange={(event) => { setFilterValue(event.target.value); setPage(1); }} placeholder="พิมพ์ค่าที่ต้องการค้นหา" />
                </label>
                <label>
                  <span>เรียงตาม</span>
                  <select value={sortField} onChange={(event) => { setSortField(event.target.value); setPage(1); }}>
                    {columns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>ลำดับ</span>
                  <select value={sortDirection} onChange={(event) => { setSortDirection(event.target.value); setPage(1); }}>
                    <option value="asc">น้อยไปมาก</option>
                    <option value="desc">มากไปน้อย</option>
                  </select>
                </label>
                {filterValue ? <button type="button" className="db-clear-filter" onClick={() => { setFilterValue(""); setPage(1); }}>ล้างตัวกรอง</button> : null}
              </div>
              <DataGrid rows={preview.rows} columns={visibleColumns} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              <footer className="db-data-footer">
                <span>{formatRowEstimate(selectedTableMetadata?.rowCountEstimate, true)} · แสดงสูงสุด {PAGE_SIZE} แถวต่อหน้า</span>
                <div>
                  <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>ก่อนหน้า</button>
                  <strong>หน้า {page}</strong>
                  <button type="button" onClick={() => setPage((value) => value + 1)} disabled={!preview.truncated}>ถัดไป</button>
                </div>
              </footer>
            </section>
          ) : null}

          {activeTab === "columns" ? (
            <section role="tabpanel" aria-label="Columns">
              <MetadataTable
                empty="ตารางนี้ไม่มีคอลัมน์ที่เปิดดูได้"
                rows={columns}
                columns={[
                  { key: "name", label: "Column" },
                  { key: "dataType", label: "Type" },
                  { key: "nullable", label: "Nullable", render: (row) => row.nullable ? "Yes" : "No" },
                  { key: "primaryKey", label: "Key", render: (row) => row.primaryKey ? "Primary key" : row.foreignKeys?.length ? "Foreign key" : "—" },
                ]}
              />
            </section>
          ) : null}

          {activeTab === "constraints" ? (
            <section role="tabpanel" aria-label="Constraints">
              <MetadataTable
                empty="ไม่พบ constraint สำหรับตารางนี้"
                rows={metadata.constraints}
                columns={[
                  { key: "name", label: "Constraint" },
                  { key: "type", label: "Type" },
                  { key: "columns", label: "Columns", render: (row) => Array.isArray(row.columns) ? row.columns.join(", ") : "—" },
                  { key: "definition", label: "Definition" },
                ]}
              />
            </section>
          ) : null}

          {activeTab === "foreignKeys" ? (
            <section role="tabpanel" aria-label="Foreign Keys">
              <MetadataTable
                empty="ตารางนี้ไม่มี Foreign Key"
                rows={metadata.foreignKeys}
                columns={[
                  { key: "name", label: "Foreign key" },
                  { key: "columnName", label: "Column" },
                  { key: "referencedTable", label: "References", render: (row) => `${row.referencedSchema}.${row.referencedTable}.${row.referencedColumn}` },
                ]}
              />
            </section>
          ) : null}

          {activeTab === "indexes" ? (
            <section role="tabpanel" aria-label="Indexes">
              <MetadataTable
                empty="ตารางนี้ไม่มี index"
                rows={metadata.indexes}
                columns={[
                  { key: "name", label: "Index" },
                  { key: "method", label: "Method" },
                  { key: "unique", label: "Unique", render: (row) => row.unique ? "Yes" : "No" },
                  { key: "definition", label: "Definition" },
                ]}
              />
            </section>
          ) : null}
        </main>
      </section>
    </PageContainer>
  );
}
