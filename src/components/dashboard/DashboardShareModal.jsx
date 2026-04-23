import React, { useEffect, useMemo, useState } from "react";

function copyWithFallback(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  window.prompt("คัดลอกข้อความด้านล่าง", text);
  return Promise.resolve();
}

function TabButton({ id, label, isActive, onSelect }) {
  return (
    <button
      type="button"
      className={`dashboard-share-tab${isActive ? " is-active" : ""}`}
      onClick={() => onSelect(id)}
    >
      {label}
    </button>
  );
}

function ToggleField({ label, checked, onChange, hint }) {
  return (
    <label className="dashboard-share-toggle">
      <span className="dashboard-share-toggle-copy">
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export default function DashboardShareModal({
  dashboardName,
  activeTab = "share",
  onChangeTab,
  canExport = false,
  exportBusy = false,
  onDownloadPng,
  onDownloadJpg,
  publicUrl,
  embedUrl,
  embedCode,
  options,
  onChangeOptions,
  onClose,
}) {
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    if (!copyState) return undefined;
    const timer = window.setTimeout(() => setCopyState(""), 1600);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.body.classList.add("dashboard-share-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("dashboard-share-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const exportHint = useMemo(() => {
    if (canExport) return "ส่งออกเฉพาะพื้นที่แดชบอร์ดในรูปแบบภาพที่สะอาด พร้อมใช้งานต่อได้ทันที";
    return "เพิ่มอย่างน้อย 1 วิดเจ็ตก่อน จึงจะส่งออกภาพแดชบอร์ดได้";
  }, [canExport]);

  async function handleCopy(label, value) {
    try {
      await copyWithFallback(value);
      setCopyState(`คัดลอก${label}แล้ว`);
    } catch {
      setCopyState(`ยังไม่สามารถคัดลอก${label}ได้`);
    }
  }

  return (
    <div className="dashboard-share-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="dashboard-share-modal"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(920px, calc(100vw - 32px))",
          maxWidth: "920px",
          borderRadius: 28,
          padding: 24,
          boxShadow: "0 28px 80px -40px rgba(15, 23, 42, 0.35)",
        }}
      >
        <div className="dashboard-share-modal-head">
          <div className="dashboard-share-modal-copy">
            <span className="dashboard-share-kicker">แชร์แดชบอร์ด</span>
            <h2 className="dashboard-share-title">{dashboardName}</h2>
            <p className="dashboard-share-description">
              ส่งออกเป็นภาพ คัดลอกลิงก์สาธารณะ หรือสร้าง iframe สำหรับฝังในเว็บไซต์อื่น
            </p>
          </div>
          <button type="button" className="dashboard-share-close" onClick={onClose} aria-label="ปิดหน้าต่างแชร์">
            ปิด
          </button>
        </div>

        <div className="dashboard-share-tabs" role="tablist" aria-label="ตัวเลือกการแชร์แดชบอร์ด">
          <TabButton id="export" label="ส่งออกเป็นภาพ" isActive={activeTab === "export"} onSelect={onChangeTab} />
          <TabButton id="share" label="แชร์ลิงก์" isActive={activeTab === "share"} onSelect={onChangeTab} />
          <TabButton id="embed" label="ฝังเว็บไซต์" isActive={activeTab === "embed"} onSelect={onChangeTab} />
        </div>

        {copyState ? (
          <div className="dashboard-share-feedback" role="status">
            {copyState}
          </div>
        ) : null}

        <div className="dashboard-share-body">
          {activeTab === "export" ? (
            <section className="dashboard-share-panel" style={{ padding: 20, borderRadius: 22 }}>
              <div className="dashboard-share-panel-copy">
                <strong>ส่งออกเป็นภาพ</strong>
                <p>{exportHint}</p>
              </div>
              <div className="dashboard-share-action-row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="dashboard-toolbar-btn is-primary"
                  onClick={onDownloadPng}
                  disabled={!canExport || exportBusy}
                >
                  {exportBusy ? "กำลังเตรียมไฟล์..." : "ดาวน์โหลด PNG"}
                </button>
                <button
                  type="button"
                  className="dashboard-toolbar-btn"
                  onClick={onDownloadJpg}
                  disabled={!canExport || exportBusy}
                >
                  ดาวน์โหลด JPG
                </button>
              </div>
            </section>
          ) : null}

          {activeTab === "share" ? (
            <section className="dashboard-share-panel" style={{ padding: 20, borderRadius: 22 }}>
              <div className="dashboard-share-panel-copy">
                <strong>ลิงก์สาธารณะ</strong>
                <p>เปิดหน้าแดชบอร์ดแบบดูอย่างเดียว โดยซ่อนเครื่องมือแก้ไขที่ไม่จำเป็น</p>
              </div>
              <label className="dashboard-share-field" style={{ display: "grid", gap: 8 }}>
                <span>ลิงก์สาธารณะ</span>
                <textarea readOnly value={publicUrl} className="dashboard-share-textarea" />
              </label>
              <div className="dashboard-share-action-row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className="dashboard-toolbar-btn is-primary" onClick={() => handleCopy("ลิงก์", publicUrl)}>
                  คัดลอกลิงก์
                </button>
                <a className="dashboard-toolbar-btn" href={publicUrl} target="_blank" rel="noreferrer">
                  เปิดหน้าแสดงผล
                </a>
              </div>
            </section>
          ) : null}

          {activeTab === "embed" ? (
            <section className="dashboard-share-panel" style={{ padding: 20, borderRadius: 22 }}>
              <div className="dashboard-share-panel-copy">
                <strong>ฝังด้วย iframe</strong>
                <p>โหมดฝังเป็นแบบดูอย่างเดียว และซ่อนเครื่องมือแก้ไขอัตโนมัติ</p>
              </div>

              <div className="dashboard-share-form-grid" style={{ gap: 14 }}>
                <label className="dashboard-share-field" style={{ display: "grid", gap: 8 }}>
                  <span>ความกว้าง</span>
                  <input
                    className="dashboard-share-input"
                    type="number"
                    min="480"
                    step="20"
                    value={options.width}
                    onChange={(event) => onChangeOptions({ width: Number(event.target.value) || 1200 })}
                  />
                </label>
                <label className="dashboard-share-field" style={{ display: "grid", gap: 8 }}>
                  <span>ความสูง</span>
                  <input
                    className="dashboard-share-input"
                    type="number"
                    min="320"
                    step="20"
                    value={options.height}
                    onChange={(event) => onChangeOptions({ height: Number(event.target.value) || 720 })}
                  />
                </label>
                <label className="dashboard-share-field" style={{ display: "grid", gap: 8 }}>
                  <span>ธีม</span>
                  <select
                    className="dashboard-share-input"
                    value={options.theme}
                    onChange={(event) => onChangeOptions({ theme: event.target.value })}
                  >
                    <option value="auto">อัตโนมัติ</option>
                    <option value="light">สว่าง</option>
                    <option value="dark">มืด</option>
                  </select>
                </label>
              </div>

              <div className="dashboard-share-toggle-grid" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <ToggleField
                  label="ปรับกว้างอัตโนมัติ"
                  checked={options.responsive}
                  hint="ใช้ความกว้าง 100% และจำกัดความกว้างสูงสุด"
                  onChange={(nextValue) => onChangeOptions({ responsive: nextValue })}
                />
                <ToggleField
                  label="แสดงหัวข้อ"
                  checked={options.showHeader}
                  hint="ปิดเพื่อให้แสดงผลกระชับขึ้น"
                  onChange={(nextValue) => onChangeOptions({ showHeader: nextValue })}
                />
              </div>

              <label className="dashboard-share-field" style={{ display: "grid", gap: 8 }}>
                <span>ลิงก์ฝังเว็บไซต์</span>
                <textarea readOnly value={embedUrl} className="dashboard-share-textarea" />
              </label>
              <label className="dashboard-share-field" style={{ display: "grid", gap: 8 }}>
                <span>โค้ด iframe</span>
                <textarea readOnly value={embedCode} className="dashboard-share-textarea is-code" />
              </label>
              <div className="dashboard-share-action-row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className="dashboard-toolbar-btn is-primary" onClick={() => handleCopy("โค้ด iframe ", embedCode)}>
                  คัดลอกโค้ด iframe
                </button>
                <a className="dashboard-toolbar-btn" href={embedUrl} target="_blank" rel="noreferrer">
                  เปิดหน้าแสดงผล
                </a>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
