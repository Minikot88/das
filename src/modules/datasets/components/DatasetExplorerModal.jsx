import React, { useMemo, useState } from "react";
import { TYPE_BADGE, mockDataset, TYPE_COLOR } from "@infrastructure/mock/mockData";
import useFocusTrap from "@shared/hooks/useFocusTrap";

const DATASET_FIELDS = mockDataset?.fields ?? [];
const DATASET_CARDS = [
  {
    id: mockDataset.id,
    name: mockDataset.name,
    source: "mockData.js",
    cadence: "รีเฟรชรายวัน",
    owner: "ทีมวิเคราะห์",
    rows: mockDataset.rows?.length ?? 0,
    fields: DATASET_FIELDS.length,
  },
  {
    id: "finance_summary",
    name: "สรุปการเงิน",
    source: "ชุดข้อมูลที่วางแผนไว้",
    cadence: "รีเฟรชรายเดือน",
    owner: "การเงิน",
    rows: 0,
    fields: 0,
  },
  {
    id: "research_pipeline",
    name: "กระบวนการวิจัย",
    source: "ชุดข้อมูลที่วางแผนไว้",
    cadence: "รีเฟรชรายสัปดาห์",
    owner: "วิจัย",
    rows: 0,
    fields: 0,
  },
];

function isMatchField(field, query) {
  if (!query) return true;
  const search = query.toLowerCase();
  return (
    field?.name?.toLowerCase().includes(search) ||
    field?.label?.toLowerCase().includes(search) ||
    field?.type?.toLowerCase().includes(search)
  );
}

function renderFieldRow(field, index) {
  const fieldType = field.type ?? "text";
  return (
    <div className="dataset-explorer-field" key={`${field.name}-${index}`}>
      <div className="dataset-explorer-field-meta">
        <span className="dataset-explorer-field-name">{field.name}</span>
        <span className="dataset-explorer-field-label">{field.label}</span>
      </div>
      <span
        className="dataset-explorer-field-type"
        style={{
          backgroundColor: `${TYPE_COLOR[fieldType] ?? "#64748b"}22`,
          color: TYPE_COLOR[fieldType] ?? "#64748b",
        }}
      >
        {TYPE_BADGE[fieldType] ?? "TXT"}
      </span>
    </div>
  );
}

function DatasetHeader() {
  return (
    <section className="dataset-explorer-header">
      <span className="dataset-explorer-source">แหล่งข้อมูล: <strong>mockData.js</strong></span>
      <div className="dataset-explorer-stats">
        <span>{mockDataset.rows?.length ?? 0} แถว</span>
        <span>{DATASET_FIELDS.length} ฟิลด์</span>
        <span>เปิดการตรวจจับอัตโนมัติ</span>
      </div>
    </section>
  );
}

function sampleRows(rows, limit = 5) {
  return (rows ?? []).slice(0, limit);
}

export default function DatasetExplorerModal({ isOpen, onClose }) {
  const [search, setSearch] = useState("");
  const dialogRef = useFocusTrap(isOpen, onClose);

  const filteredFields = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return DATASET_FIELDS.filter((field) => isMatchField(field, normalizedSearch));
  }, [search]);

  if (!isOpen) return null;

  return (
    <div
      className="dataset-explorer-overlay"
      role="presentation"
      onClick={onClose}
    >
      <section
        ref={dialogRef}
        className="dataset-explorer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dataset-explorer-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dataset-explorer-titlebar">
          <div>
            <span className="dataset-explorer-kicker">ตัวสำรวจชุดข้อมูล</span>
            <h2 id="dataset-explorer-title">ชุดข้อมูลและฟิลด์</h2>
          </div>
          <button type="button" onClick={onClose} className="dataset-explorer-close" aria-label="ปิดตัวสำรวจชุดข้อมูล">
            x
          </button>
        </header>

        <div className="dataset-explorer-search-wrap">
          <input
            className="dataset-explorer-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาฟิลด์จากชื่อ ป้ายกำกับ หรือชนิดข้อมูล"
            aria-label="ค้นหาฟิลด์ในชุดข้อมูล"
          />
        </div>

        <DatasetHeader />

        <div className="dataset-explorer-body">
          <div className="dataset-explorer-section">
            <h3>การ์ดชุดข้อมูล</h3>
            <div className="dataset-explorer-card-grid">
              {DATASET_CARDS.map((dataset) => (
                <article
                  key={dataset.id}
                  className={`dataset-explorer-card${dataset.id === mockDataset.id ? " is-active" : ""}`}
                >
                  <div className="dataset-explorer-card-head">
                    <strong>{dataset.name}</strong>
                    <span>{dataset.id === mockDataset.id ? "ใช้งานอยู่" : "รอข้อมูล"}</span>
                  </div>
                  <div className="dataset-explorer-card-meta">
                    <span>{dataset.source}</span>
                    <span>{dataset.cadence}</span>
                    <span>{dataset.owner}</span>
                  </div>
                  <div className="dataset-explorer-card-stats">
                    <span>{dataset.rows} แถว</span>
                    <span>{dataset.fields} ฟิลด์</span>
                  </div>
                </article>
              ))}
            </div>

            <h3>โครงสร้างข้อมูล</h3>
            <div className="dataset-explorer-fields">
              {filteredFields.length ? filteredFields.map(renderFieldRow) : (
                <div className="dataset-explorer-empty">ไม่พบฟิลด์ที่ตรงกับการค้นหา</div>
              )}
            </div>
          </div>

          <div className="dataset-explorer-section">
            <h3>ตัวอย่างข้อมูล</h3>
            <div className="dataset-explorer-table">
              <div className="dataset-explorer-table-head">
                {DATASET_FIELDS.slice(0, 4).map((field) => (
                  <span key={field.name}>{field.label}</span>
                ))}
              </div>
              {sampleRows(mockDataset.rows, 5).map((row, index) => (
                <div key={`${row?.id ?? row?.region ?? "row"}-${index}`} className="dataset-explorer-table-row">
                  {DATASET_FIELDS.slice(0, 4).map((field) => (
                    <span key={`${field.name}-${index}`}>{String(row?.[field.name] ?? "-")}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
