import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, PageHeader } from "../components/layout/Layout";
import EnterpriseDataTable from "../components/ui/EnterpriseDataTable";
import { mockDataset } from "../data/mockData";
import { selectProjectDatasets, useWorkspaceSelector } from "../domain/workspace/workspaceSelectors";
import { useStore } from "../store/useStore";
import { createDatasetFromCsv, parseCsvTextAsync, validateCsvFile } from "../utils/csvImport";

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
  const importDataset = useStore((state) => state.importDataset);
  const deleteImportedDataset = useStore((state) => state.deleteImportedDataset);
  const activeProjectId = useStore((state) => state.activeProjectId);
  const importedDatasets = useWorkspaceSelector((snapshot) => selectProjectDatasets(snapshot, activeProjectId));
  const appSettings = useStore((state) => state.appSettings);
  const [selectedDatasetId, setSelectedDatasetId] = useState(mockDataset.id);
  const [parsedCsv, setParsedCsv] = useState(null);
  const [fileName, setFileName] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [importError, setImportError] = useState("");

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

  const datasets = useMemo(
    () => [
      {
        ...mockDataset,
        source: "ชุดข้อมูลตัวอย่างในระบบ",
        rowCount: mockDataset.rows?.length ?? 0,
        columnCount: mockDataset.fields?.length ?? 0,
      },
      ...importedDatasets,
    ],
    [importedDatasets]
  );
  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId) ?? datasets[0];
  const previewRows = useMemo(
    () => parsedCsv?.rows ?? selectedDataset?.rows ?? [],
    [parsedCsv?.rows, selectedDataset?.rows]
  );
  const activeFields = useMemo(
    () => parsedCsv?.fields ?? selectedDataset?.fields ?? [],
    [parsedCsv?.fields, selectedDataset?.fields]
  );
  const previewColumns = useMemo(
    () => parsedCsv
      ? parsedCsv.fields.map((field) => ({ key: field.name, label: field.label }))
      : datasetColumns(selectedDataset),
    [parsedCsv, selectedDataset]
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

  function handleImport() {
    if (!parsedCsv?.validation?.valid) {
      setImportError("แก้ข้อผิดพลาดของ CSV ก่อนนำเข้า");
      return;
    }
    const dataset = createDatasetFromCsv({
      name: datasetName,
      fileName,
      parsed: parsedCsv,
      projectId: activeProjectId,
    });
    importDataset(dataset);
    setSelectedDatasetId(dataset.id);
    setParsedCsv(null);
    setFileName("");
    setDatasetName("");
    setImportError("");
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
            <strong>{datasets.length} ชุดข้อมูล</strong>
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
                <span>{dataset.source || "ชุดข้อมูลในเครื่อง"}</span>
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
              <p>ชุดข้อมูล CSV ที่นำเข้าจะถูกเก็บไว้ในเครื่องจนกว่าจะเชื่อมต่อระบบหลังบ้าน</p>
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

          <section className="datasets-schema-panel">
            <div className="datasets-schema-head">
              <div>
                <span>{parsedCsv ? "แมปคอลัมน์" : "โครงสร้างข้อมูล"}</span>
                <h2>{parsedCsv ? fileName : selectedDataset?.name}</h2>
              </div>
              {!parsedCsv && selectedDataset?.id !== mockDataset.id ? (
                <button
                  type="button"
                  className="dashboard-toolbar-btn"
                  onClick={() => {
                    deleteImportedDataset(selectedDataset.id);
                    setSelectedDatasetId(mockDataset.id);
                  }}
                >
                  ลบ
                </button>
              ) : null}
            </div>
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
            title={parsedCsv ? "ตัวอย่าง CSV" : `ตัวอย่าง ${selectedDataset?.name}`}
            rows={previewRows}
            columns={previewColumns}
            density={appSettings.density}
          />
        </section>
      </div>
    </PageContainer>
  );
}
