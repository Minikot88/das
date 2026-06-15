import React, { useEffect, useMemo, useState } from "react";
import useFocusTrap from "../../hooks/useFocusTrap";

function copyWithFallback(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
    return Promise.resolve();
  } finally {
    textarea.remove();
  }
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
  onDownloadPdf,
  publicUrl,
  embedUrl,
  embedCode,
  options,
  onChangeOptions,
  onClose,
}) {
  const [copyState, setCopyState] = useState("");
  const dialogRef = useFocusTrap(true, onClose);

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
    if (canExport) return "ส่งออกพื้นที่แดชบอร์ดปัจจุบันเป็นรูปภาพคุณภาพสูง";
    return "เพิ่มวิดเจ็ตอย่างน้อยหนึ่งรายการก่อนส่งออกรูปภาพแดชบอร์ด";
  }, [canExport]);

  async function handleCopy(label, value) {
    try {
      await copyWithFallback(value);
      setCopyState(`คัดลอก${label}แล้ว`);
    } catch {
      setCopyState(`ไม่สามารถคัดลอก${label}`);
    }
  }

  return (
    <div className="dashboard-share-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="dashboard-share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-share-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-share-modal-head">
          <div className="dashboard-share-modal-copy">
            <span className="dashboard-share-kicker">แชร์แดชบอร์ด</span>
            <h2 className="dashboard-share-title" id="dashboard-share-title">{dashboardName}</h2>
            <p className="dashboard-share-description">
              ส่งออกเป็นรูปภาพ คัดลอกลิงก์สาธารณะ หรือสร้างโค้ดฝัง iframe
            </p>
          </div>
          <button type="button" className="dashboard-share-close" onClick={onClose} aria-label="ปิดหน้าต่างแชร์">
            ปิด
          </button>
        </div>

        <div className="dashboard-share-tabs" role="tablist" aria-label="ตัวเลือกการแชร์แดชบอร์ด">
          <TabButton id="export" label="ส่งออกรูปภาพ" isActive={activeTab === "export"} onSelect={onChangeTab} />
          <TabButton id="share" label="แชร์ลิงก์" isActive={activeTab === "share"} onSelect={onChangeTab} />
          <TabButton id="embed" label="ฝัง" isActive={activeTab === "embed"} onSelect={onChangeTab} />
        </div>

        {copyState ? (
          <div className="dashboard-share-feedback" role="status">
            {copyState}
          </div>
        ) : null}

        <div className="dashboard-share-body">
          {activeTab === "export" ? (
            <section className="dashboard-share-panel">
              <div className="dashboard-share-panel-copy">
                <strong>ส่งออกรูปภาพ</strong>
                <p>{exportHint}</p>
              </div>
              <div className="dashboard-share-action-row">
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
                <button
                  type="button"
                  className="dashboard-toolbar-btn"
                  onClick={onDownloadPdf}
                  disabled={!canExport || exportBusy}
                >
                  ดาวน์โหลด PDF
                </button>
              </div>
            </section>
          ) : null}

          {activeTab === "share" ? (
            <section className="dashboard-share-panel">
              <div className="dashboard-share-panel-copy">
                <strong>ลิงก์สาธารณะ</strong>
                <p>เปิดแดชบอร์ดแบบอ่านอย่างเดียวโดยซ่อนเครื่องมือแก้ไข</p>
              </div>
              <label className="dashboard-share-field">
                <span>URL สาธารณะ</span>
                <textarea readOnly value={publicUrl} className="dashboard-share-textarea" />
              </label>
              <div className="dashboard-share-action-row">
                <button type="button" className="dashboard-toolbar-btn is-primary" onClick={() => handleCopy("ลิงก์", publicUrl)}>
                  คัดลอกลิงก์
                </button>
                <a className="dashboard-toolbar-btn" href={publicUrl} target="_blank" rel="noreferrer">
                  เปิด
                </a>
              </div>
            </section>
          ) : null}

          {activeTab === "embed" ? (
            <section className="dashboard-share-panel">
              <div className="dashboard-share-panel-copy">
                <strong>ฝังด้วย iframe</strong>
                <p>ฝังในหน้าภายนอกด้วยโหมดดูข้อมูลที่สะอาดตา</p>
              </div>

              <div className="dashboard-share-form-grid">
                <label className="dashboard-share-field">
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
                <label className="dashboard-share-field">
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
                <label className="dashboard-share-field">
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

              <div className="dashboard-share-toggle-grid">
                <ToggleField
                  label="ปรับความกว้างอัตโนมัติ"
                  checked={options.responsive}
                  hint="ใช้ความกว้าง 100% พร้อมจำกัดขนาดสูงสุด"
                  onChange={(nextValue) => onChangeOptions({ responsive: nextValue })}
                />
                <ToggleField
                  label="แสดงส่วนหัว"
                  checked={options.showHeader}
                  hint="ปิดเพื่อให้พื้นที่ฝังกระชับขึ้น"
                  onChange={(nextValue) => onChangeOptions({ showHeader: nextValue })}
                />
              </div>

              <label className="dashboard-share-field">
                <span>URL สำหรับฝัง</span>
                <textarea readOnly value={embedUrl} className="dashboard-share-textarea" />
              </label>
              <label className="dashboard-share-field">
                <span>โค้ด iframe</span>
                <textarea readOnly value={embedCode} className="dashboard-share-textarea is-code" />
              </label>
              <div className="dashboard-share-action-row">
                <button type="button" className="dashboard-toolbar-btn is-primary" onClick={() => handleCopy("โค้ด iframe", embedCode)}>
                  คัดลอกโค้ด iframe
                </button>
                <a className="dashboard-toolbar-btn" href={embedUrl} target="_blank" rel="noreferrer">
                  เปิด
                </a>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
