import React from "react";
import useFocusTrap from "@shared/hooks/useFocusTrap";

export default function ChartSavePanel({
  builderContext,
  settings = {},
  validation,
  saving,
  error,
  isEditing = false,
  onSettingChange,
  onSave,
  onCancel,
  onClose,
}) {
  const dialogRef = useFocusTrap(true, onClose);
  const contextLabel = builderContext
    ? `${builderContext.projectId} / ${builderContext.sheetId} / ${builderContext.dashboardId}`
    : "ไม่พร้อมใช้งาน";

  return (
    <div className="builder-v3-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="builder-v3-panel builder-v3-save-panel builder-v3-save-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="builder-save-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="builder-v3-section-head">
          <div>
            <span className="builder-v3-kicker">บันทึก</span>
            <h2 id="builder-save-title" className="builder-v3-title">{isEditing ? "อัปเดตกราฟ" : "บันทึกกราฟ"}</h2>
          </div>
          <button type="button" className="builder-v3-icon-button" aria-label="ปิดหน้าต่างบันทึก" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="builder-v3-save-card">
          <strong>ปลายทาง</strong>
          <span>{contextLabel}</span>
        </div>

        <div className="builder-v3-save-form-preview" aria-label="รายละเอียดการบันทึกกราฟ">
          <label className="builder-v3-field">
            <span>ชื่อกราฟ</span>
            <input
              value={settings.title ?? ""}
              placeholder={isEditing ? "ชื่อกราฟเดิม" : "กราฟใหม่ในแดชบอร์ด"}
              onChange={(event) => onSettingChange?.("title", event.target.value)}
            />
          </label>
          <label className="builder-v3-field">
            <span>คำอธิบาย</span>
            <textarea
              rows={3}
              value={settings.subtitle ?? ""}
              placeholder="ภาพข้อมูลพร้อมนำเสนอสำหรับแดชบอร์ดนี้"
              onChange={(event) => onSettingChange?.("subtitle", event.target.value)}
            />
          </label>
          <label className="builder-v3-field">
            <span>โฟลเดอร์</span>
            <input
              value={settings.folder ?? ""}
              placeholder="ภาพข้อมูลแดชบอร์ด"
              onChange={(event) => onSettingChange?.("folder", event.target.value)}
            />
          </label>
          <label className="builder-v3-field">
            <span>แท็ก</span>
            <input
              value={settings.tags ?? ""}
              placeholder="BI, วิเคราะห์, แดชบอร์ด"
              onChange={(event) => onSettingChange?.("tags", event.target.value)}
            />
          </label>
        </div>

        {error ? <div className="builder-v3-validation-card is-error"><p>{error}</p></div> : null}
        {!error && validation.warnings.length ? (
          <div className="builder-v3-validation-card">
            {validation.warnings.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}

        <div className="builder-v3-save-actions">
          <button type="button" className="builder-v3-button" onClick={onCancel}>
            กลับ
          </button>
          <button
            type="button"
            className="builder-v3-button is-primary"
            onClick={onSave}
            disabled={!validation.valid || saving}
          >
            {saving ? "กำลังบันทึก..." : isEditing ? "อัปเดตกราฟ" : "บันทึกกราฟ"}
          </button>
        </div>
      </section>
    </div>
  );
}
