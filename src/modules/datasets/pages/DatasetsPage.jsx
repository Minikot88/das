import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, PageHeader } from "@app/layouts/Layout";
import EnterpriseDataTable from "@shared/components/ui/EnterpriseDataTable";
import { useStore } from "@app/store/useStore";
import {
  API_ACTIVE_PROJECT_KEY,
  getProjects,
  resolveApiActiveProject,
} from "@modules/projects";
import { parseCsvTextAsync, validateCsvFile } from "@modules/datasets/lib/csvImport";
import {
  archiveDataset,
  getDatasetFields,
  importDatasetCsv,
  listDatasets,
  queryDataset,
  listExternalSources,
  listExternalTables,
  listExternalColumns,
  previewExternalSource,
  createExternalDataset,
  renameDataset,
} from "@modules/datasets/api/datasetApi";

function datasetColumns(dataset) {
  return (dataset?.fields ?? []).map((field) => ({
    key: field.name,
    label: field.label || field.name,
  }));
}

function datasetSummary(dataset) {
  return {
    rows: dataset?.rows?.length ?? dataset?.rowCount ?? 0,
    columns: dataset?.fields?.length ?? dataset?.columnCount ?? 0,
  };
}

function createColumnStats(rows = [], fields = []) {
  return fields.map((field) => {
    const values = rows.map((row) => row?.[field.name]).filter((value) => value !== "" && value !== null && value !== undefined);
    const numericValues = values.map(Number).filter(Number.isFinite);
    const uniqueCount = new Set(values.map((value) => String(value))).size;
    const average = numericValues.length
      ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
      : null;
    return {
      ...field,
      nonEmpty: values.length,
      uniqueCount,
      min: numericValues.length ? Math.min(...numericValues) : null,
      max: numericValues.length ? Math.max(...numericValues) : null,
      average,
    };
  });
}

function formatStat(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}

function formatFieldType(type) {
  const labels = {
    string: "ข้อความ",
    number: "ตัวเลข",
    date: "วันที่",
    boolean: "บูลีน",
    category: "หมวดหมู่",
  };
  return labels[type] ?? type;
}

export default function DatasetsPage() {
  const navigate = useNavigate();
  const storeActiveProjectId = useStore((state) => state.activeProjectId);
  const appSettings = useStore((state) => state.appSettings);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [datasetRows, setDatasetRows] = useState([]);
  const [datasetFields, setDatasetFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parsedCsv, setParsedCsv] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [importError, setImportError] = useState("");
  const [externalSources, setExternalSources] = useState([]);
  const [externalSchema, setExternalSchema] = useState("");
  const [externalTables, setExternalTables] = useState([]);
  const [externalTable, setExternalTable] = useState("");
  const [externalColumns, setExternalColumns] = useState([]);
  const [externalPreview, setExternalPreview] = useState([]);
  const [selectedExternalFields, setSelectedExternalFields] = useState([]);
  const [externalFilterField, setExternalFilterField] = useState("");
  const [externalFilterValue, setExternalFilterValue] = useState("");
  const [externalSortField, setExternalSortField] = useState("");
  const [externalSortDirection, setExternalSortDirection] = useState("asc");
  const [externalPage, setExternalPage] = useState(1);
  const [savedExternalDatasetId, setSavedExternalDatasetId] = useState("");
  const [catalogName, setCatalogName] = useState("");

  const reloadDatasets = useCallback(async (preferredId = "") => {
    if (!activeProjectId) {
      return;
    }

    setLoading(true);
    try {
      const response = await listDatasets({ projectId: activeProjectId });
      const items = Array.isArray(response?.items) ? response.items : [];
      setDatasets(items);
      setSelectedDatasetId((current) => {
        const candidate = preferredId || current;
        return items.some((item) => item.id === candidate) ? candidate : (items[0]?.id ?? "");
      });
      setImportError("");
    } catch (error) {
      setDatasets([]);
      setSelectedDatasetId("");
      setImportError(error?.message || "ไม่สามารถโหลดชุดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    let active = true;

    getProjects()
      .then((items) => {
        if (!active) return;

        const projects = Array.isArray(items) ? items : [];
        const selectedProject = resolveApiActiveProject(
          projects,
          window.localStorage.getItem(API_ACTIVE_PROJECT_KEY),
          storeActiveProjectId,
        );

        if (!selectedProject) {
          setActiveProjectId(null);
          setDatasets([]);
          setExternalSources([]);
          setLoading(false);
          return;
        }

        window.localStorage.setItem(API_ACTIVE_PROJECT_KEY, selectedProject.id);
        useStore.setState?.({ activeProjectId: selectedProject.id });
        setActiveProjectId(selectedProject.id);
      })
      .catch((error) => {
        if (!active) return;
        setActiveProjectId(null);
        setDatasets([]);
        setExternalSources([]);
        setLoading(false);
        setImportError(error?.message || "ไม่สามารถโหลดโปรเจกต์ได้");
      });

    return () => {
      active = false;
    };
  }, [storeActiveProjectId]);

  useEffect(() => {
    if (activeProjectId) {
      void reloadDatasets();
    }
  }, [activeProjectId, reloadDatasets]);

  useEffect(() => { if (!activeProjectId) return; listExternalSources(activeProjectId).then(result => { const items = result?.items ?? []; setExternalSources(items); setExternalSchema(items[0]?.schemaName ?? ""); }).catch(() => setExternalSources([])); }, [activeProjectId]);
  useEffect(() => { if (!externalSchema) return; listExternalTables(externalSchema, activeProjectId).then(result => { const items = result?.items ?? []; setExternalTables(items); setExternalTable(items[0]?.name ?? ""); }).catch(error => setImportError(error.message)); }, [activeProjectId, externalSchema]);
  useEffect(() => { if (!externalSchema || !externalTable) return; listExternalColumns(externalSchema, externalTable, activeProjectId).then(result => { const items = result?.items ?? []; setExternalColumns(items); setSelectedExternalFields(items.map(column => column.name)); setExternalFilterField(items[0]?.name ?? ""); setExternalSortField(items[0]?.name ?? ""); setExternalPage(1); }).catch(error => setImportError(error.message)); }, [activeProjectId, externalSchema, externalTable]);
  useEffect(() => { if (!externalSchema || !externalTable || !selectedExternalFields.length) return; previewExternalSource({ projectId: activeProjectId, schemaName: externalSchema, tableName: externalTable, select: selectedExternalFields, filters: externalFilterValue ? [{ field: externalFilterField, operator: "contains", value: externalFilterValue }] : [], sort: externalSortField ? { field: externalSortField, direction: externalSortDirection } : undefined, page: externalPage, pageSize: 50 }).then(result => setExternalPreview(result?.rows ?? [])).catch(error => setImportError(error.message)); }, [activeProjectId, externalFilterField, externalFilterValue, externalPage, externalSchema, externalSortDirection, externalSortField, externalTable, selectedExternalFields]);

  async function saveExternalDataset() {
    try {
      const dataset = await createExternalDataset({
        projectId: activeProjectId,
        name: `${externalSchema}.${externalTable}`,
        schemaName: externalSchema,
        tableName: externalTable,
        selectedFields: selectedExternalFields,
        filters: externalFilterValue ? [{ field: externalFilterField, operator: "contains", value: externalFilterValue }] : [],
        sort: externalSortField ? { field: externalSortField, direction: externalSortDirection } : undefined,
      });
      setSavedExternalDatasetId(dataset?.id ?? "");
      await reloadDatasets(dataset?.id ?? "");
    } catch (error) {
      setImportError(error.message);
    }
  }

  useEffect(() => {
    if (!selectedDatasetId) {
      setDatasetRows([]);
      setDatasetFields([]);
      return;
    }
    let active = true;
    Promise.all([
      getDatasetFields(selectedDatasetId),
      queryDataset(selectedDatasetId, { page: 1, pageSize: 200 }),
    ]).then(([fields, result]) => {
      if (!active) return;
      setDatasetFields(fields);
      setDatasetRows(Array.isArray(result?.rows) ? result.rows : []);
      setImportError("");
    }).catch((error) => {
      if (active) setImportError(error?.message || "ไม่สามารถโหลดตัวอย่างข้อมูลได้");
    });
    return () => {
      active = false;
    };
  }, [selectedDatasetId]);

  useEffect(() => {
    function handleRibbonCommand(event) {
      const detail = event.detail;
      if (detail?.scope !== "datasets" || detail?.command !== "focus-search") return;

      const searchInput = document.querySelector(".datasets-page .enterprise-table-controls input[type='search']");
      if (searchInput instanceof HTMLInputElement) {
        searchInput.focus();
        searchInput.select();
        searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    window.addEventListener("mini-bi:ribbon-command", handleRibbonCommand);
    return () => {
      window.removeEventListener("mini-bi:ribbon-command", handleRibbonCommand);
    };
  }, []);

  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId) ?? null;

  useEffect(() => {
    setCatalogName(selectedDataset?.name ?? "");
  }, [selectedDataset?.id, selectedDataset?.name]);

  async function renameSelectedDataset() {
    if (!selectedDataset || !catalogName.trim()) return;
    try {
      const updated = await renameDataset(selectedDataset.id, {
        name: catalogName.trim(),
        revision: selectedDataset.revision,
      });
      await reloadDatasets(updated?.id ?? selectedDataset.id);
      setImportError("");
    } catch (error) {
      setImportError(error?.message || "ไม่สามารถบันทึกชื่อชุดข้อมูลได้");
    }
  }
  const previewRows = useMemo(
    () => parsedCsv?.rows ?? datasetRows,
    [datasetRows, parsedCsv?.rows]
  );
  const activeFields = useMemo(
    () => parsedCsv?.fields ?? datasetFields,
    [datasetFields, parsedCsv?.fields]
  );
  const previewColumns = useMemo(
    () => parsedCsv
      ? parsedCsv.fields.map((field) => ({ key: field.name, label: field.label }))
      : datasetColumns({ fields: datasetFields }),
    [datasetFields, parsedCsv]
  );
  const activeStats = useMemo(
    () => createColumnStats(previewRows, activeFields),
    [activeFields, previewRows]
  );
  const activeSummary = datasetSummary({
    rows: previewRows,
    fields: activeFields,
  });

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    setImportError("");
    setParsedCsv(null);
    setSelectedFile(file ?? null);
    if (!file) return;

    try {
      validateCsvFile(file);
      const text = await file.text();
      const parsed = await parseCsvTextAsync(text);
      setFileName(file.name);
      setDatasetName(file.name.replace(/\.[^.]+$/, ""));
      setParsedCsv(parsed);
    } catch (error) {
      setImportError(error?.message || "ไม่สามารถอ่านไฟล์ CSV นี้ได้");
    }
  }

  async function handleImport() {
    if (!parsedCsv?.validation?.valid) {
      setImportError("แก้ข้อผิดพลาดของ CSV ก่อนนำเข้า");
      return;
    }
    try {
      if (!selectedFile) throw new Error("กรุณาเลือกไฟล์ CSV อีกครั้ง");
      const response = await importDatasetCsv({
        file: selectedFile,
        projectId: activeProjectId,
        name: datasetName,
        idempotencyKey: `dataset-import-${activeProjectId}-${selectedFile.name}-${selectedFile.size}`,
      });
      const datasetId = response?.dataset?.id ?? "";
      setParsedCsv(null);
      setSelectedFile(null);
      setFileName("");
      setDatasetName("");
      setImportError("");
      await reloadDatasets(datasetId);
    } catch (error) {
      setImportError(error?.message || "ไม่สามารถนำเข้าชุดข้อมูลได้");
    }
  }

  return (
    <PageContainer className="datasets-page">
      <PageHeader
        kicker="ข้อมูล"
        title="ชุดข้อมูล"
        subtitle="จัดการแหล่งข้อมูล ตาราง และไฟล์สำหรับแดชบอร์ด"
        actions={(
          <button type="button" className="dashboard-toolbar-btn is-primary" onClick={() => navigate("/connections")}>
            เชื่อมต่อฐานข้อมูล
          </button>
        )}
      />

      <div className="datasets-layout">
        <aside className="datasets-sidebar">
          <div className="datasets-sidebar-head">
            <span>แคตตาล็อก</span>
            <strong>{loading ? "กำลังโหลด…" : `${datasets.length} ชุดข้อมูล`}</strong>
          </div>
          {datasets.map((dataset) => {
            const summary = datasetSummary(dataset);
            return (
              <button
                key={dataset.id}
                type="button"
                className={`dataset-list-card${dataset.id === selectedDataset?.id ? " is-active" : ""}`}
                onClick={() => setSelectedDatasetId(dataset.id)}
              >
                <strong>{dataset.name}</strong>
                <span>{dataset.source || "ชุดข้อมูลจากระบบ"}</span>
                <small>{summary.rows} แถว / {summary.columns} คอลัมน์</small>
              </button>
            );
          })}
        </aside>

        <section className="datasets-main" aria-label="รายการชุดข้อมูล">
          <section className="datasets-import-panel">
            <div className="datasets-import-copy">
              <span>นำเข้า CSV</span>
              <h2>อัปโหลด ดูตัวอย่าง ตรวจสอบ และนำเข้า</h2>
              <p>ชุดข้อมูล CSV ที่นำเข้าจะถูกตรวจสอบและบันทึกผ่านระบบหลังบ้าน</p>
            </div>
            <div className="datasets-import-controls">
              <label className="dashboard-toolbar-btn datasets-file-picker" htmlFor="dataset-csv-input">
                เลือกไฟล์ CSV
              </label>
              <input
                id="dataset-csv-input"
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
              />
              <span className="datasets-selected-file">{fileName || "ยังไม่ได้เลือกไฟล์"}</span>
              {parsedCsv ? (
                <>
                  <label>
                    <span>ชื่อชุดข้อมูล</span>
                    <input value={datasetName} onChange={(event) => setDatasetName(event.target.value)} />
                  </label>
                  <button type="button" className="dashboard-toolbar-btn is-primary" onClick={handleImport}>
                    นำเข้าชุดข้อมูล
                  </button>
                </>
              ) : null}
            </div>
            {importError ? <div className="datasets-validation is-error">{importError}</div> : null}
            {parsedCsv ? (
              <div className="datasets-validation">
                <strong>{parsedCsv.validation.valid ? "CSV ถูกต้อง" : "ตรวจสอบไม่ผ่าน"}</strong>
                <span>ตรวจพบ {parsedCsv.rows.length} แถว / {parsedCsv.fields.length} คอลัมน์</span>
                {parsedCsv.validation.errors.map((error) => <span key={error}>{error}</span>)}
                {parsedCsv.validation.warnings.map((warning) => <span key={warning}>{warning}</span>)}
              </div>
            ) : null}
          </section>
          <section className="datasets-source-browser" aria-label="PostgreSQL external source browser">
            <header className="datasets-source-browser__head">
              <div>
                <span>PostgreSQL source</span>
                <h2>External schema browser</h2>
                <p>เลือก schema และตารางที่ได้รับอนุญาต ข้อมูลต้นทางเป็นแบบอ่านอย่างเดียว</p>
              </div>
              <div className="datasets-source-browser__actions">
                <button type="button" className="dashboard-toolbar-btn is-primary" disabled={!externalTable} onClick={saveExternalDataset}>Create live dataset</button>
                {savedExternalDatasetId ? <button type="button" className="dashboard-toolbar-btn" onClick={() => navigate(`/dashboard-v2?projectId=${encodeURIComponent(activeProjectId)}&datasetId=${encodeURIComponent(savedExternalDatasetId)}`)}>Create chart</button> : null}
              </div>
            </header>
            <div className="datasets-source-browser__controls">
              <label><span>Schema</span><select value={externalSchema} onChange={(event) => setExternalSchema(event.target.value)}>{externalSources.map(source => <option key={source.schemaName} value={source.schemaName}>{source.displayName}</option>)}</select></label>
              <label><span>Table</span><select value={externalTable} onChange={(event) => setExternalTable(event.target.value)}>{externalTables.map(table => <option key={table.name} value={table.name}>{table.name} ({table.rowCountEstimate ?? "?"})</option>)}</select></label>
              <label><span>Filter column</span><select value={externalFilterField} onChange={(event) => { setExternalFilterField(event.target.value); setExternalPage(1); }}>{externalColumns.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}</select></label>
              <label><span>Contains</span><input value={externalFilterValue} onChange={(event) => { setExternalFilterValue(event.target.value); setExternalPage(1); }} /></label>
              <label><span>Sort</span><select value={externalSortField} onChange={(event) => setExternalSortField(event.target.value)}>{externalColumns.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}</select></label>
              <label><span>Direction</span><select value={externalSortDirection} onChange={(event) => setExternalSortDirection(event.target.value)}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
            </div>
            <div className="datasets-source-browser__fields">{externalColumns.map(column => <label className="datasets-field-card" key={column.name}><input type="checkbox" checked={selectedExternalFields.includes(column.name)} onChange={(event) => setSelectedExternalFields(current => event.target.checked ? [...new Set([...current, column.name])] : current.filter(field => field !== column.name))} /><strong>{column.name}</strong><small>{column.dataType}{column.primaryKey ? " · PK" : ""}</small></label>)}</div>
            {externalPreview.length ? <EnterpriseDataTable title={`Preview ${externalSchema}.${externalTable}`} rows={externalPreview} columns={Object.keys(externalPreview[0]).map(key => ({ key, label: key }))} density={appSettings.density} /> : <div className="datasets-empty-state">No rows to preview.</div>}
            <footer className="datasets-source-browser__pagination"><button type="button" className="dashboard-toolbar-btn" disabled={externalPage <= 1} onClick={() => setExternalPage(page => Math.max(1, page - 1))}>Previous</button><span>Page {externalPage}</span><button type="button" className="dashboard-toolbar-btn" disabled={externalPreview.length < 50} onClick={() => setExternalPage(page => page + 1)}>Next</button></footer>
          </section>

          <section className="datasets-schema-panel">
            <div className="datasets-schema-head">
              <div>
                <span>{parsedCsv ? "แมปคอลัมน์" : "โครงสร้างข้อมูล"}</span>
                <h2>{parsedCsv ? fileName : selectedDataset?.name}</h2>
              </div>
              {!parsedCsv && selectedDataset ? (
                <button
                  type="button"
                  className="dashboard-toolbar-btn"
                  onClick={async () => {
                    try {
                      await archiveDataset(selectedDataset.id, selectedDataset.revision);
                      await reloadDatasets();
                    } catch (error) {
                      setImportError(error?.message || "ไม่สามารถลบชุดข้อมูลได้");
                    }
                  }}
                >
                  ลบ
                </button>
              ) : null}
            </div>
            {!parsedCsv && selectedDataset ? (
              <div className="datasets-catalog-editor" aria-label="Catalog editor">
                <label>
                  <span>Catalog dataset name</span>
                  <input aria-label="Catalog dataset name" value={catalogName} onChange={(event) => setCatalogName(event.target.value)} maxLength={180} />
                </label>
                <button type="button" className="dashboard-toolbar-btn is-primary" disabled={!catalogName.trim() || catalogName.trim() === selectedDataset.name} onClick={renameSelectedDataset}>Save name</button>
              </div>
            ) : null}
            <div className="datasets-field-grid">
              {activeFields.map((field) => (
                <div className="datasets-field-card" key={field.name}>
                  <strong>{field.label || field.name}</strong>
                  <span>{field.name}</span>
                  <small>{formatFieldType(field.type)}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="datasets-schema-panel">
            <div className="datasets-schema-head">
              <div>
                <span>สถิติ</span>
                <h2>{activeSummary.rows} แถว / {activeSummary.columns} คอลัมน์</h2>
              </div>
            </div>
            <div className="datasets-stat-grid">
              {activeStats.map((stat) => (
                <article className="datasets-stat-card" key={stat.name}>
                  <div>
                    <strong>{stat.label || stat.name}</strong>
                    <span>{formatFieldType(stat.type)}</span>
                  </div>
                  <dl>
                    <div><dt>มีค่า</dt><dd>{formatStat(stat.nonEmpty)}</dd></div>
                    <div><dt>ไม่ซ้ำ</dt><dd>{formatStat(stat.uniqueCount)}</dd></div>
                    <div><dt>ต่ำสุด</dt><dd>{formatStat(stat.min)}</dd></div>
                    <div><dt>สูงสุด</dt><dd>{formatStat(stat.max)}</dd></div>
                    <div><dt>เฉลี่ย</dt><dd>{formatStat(stat.average)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <EnterpriseDataTable
            title={parsedCsv ? "ตัวอย่าง CSV" : selectedDataset?.name ? `ตัวอย่าง ${selectedDataset.name}` : "ตัวอย่างข้อมูล"}
            rows={previewRows}
            columns={previewColumns}
            density={appSettings.density}
          />
        </section>
      </div>
    </PageContainer>
  );
}
