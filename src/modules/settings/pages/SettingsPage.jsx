import React from "react";
import { PageContainer, PageHeader } from "@app/layouts/Layout";
import { useStore } from "@app/store/useStore";

const SETTINGS_OPTIONS = {
  theme: [
    { value: "light", label: "สว่าง" },
    { value: "dark", label: "มืด" },
  ],
  density: [
    { value: "compact", label: "กระชับ" },
    { value: "comfortable", label: "มาตรฐาน" },
    { value: "spacious", label: "โปร่ง" },
  ],
  dateFormat: [
    { value: "MMM d, yyyy", label: "15 มิ.ย. 2026" },
    { value: "yyyy-MM-dd", label: "2026-06-15" },
    { value: "dd/MM/yyyy", label: "15/06/2026" },
  ],
  numberFormat: [
    { value: "compact", label: "ย่อ, 1.2 ล้าน" },
    { value: "standard", label: "มาตรฐาน, 1,234,567" },
    { value: "currency", label: "สกุลเงิน, ฿1,234" },
  ],
  defaultCanvasPreset: [
    { value: "auto", label: "อัตโนมัติ / ตอบสนอง" },
    { value: "16:9", label: "16:9 สำหรับนำเสนอ" },
    { value: "4:3", label: "4:3 สำหรับนำเสนอ" },
    { value: "square", label: "สี่เหลี่ยมจัตุรัส" },
  ],
};

const FUTURE_SETTING_NOTE = "ยังไม่พร้อมใช้งาน — รอการเชื่อมต่อกับระบบจริง";

function SettingSelect({ label, value, options, onChange, disabled = false }) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          if (!disabled) onChange?.(event.target.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {disabled ? <small className="settings-availability-note">{FUTURE_SETTING_NOTE}</small> : null}
    </label>
  );
}

function SettingToggle({ label, description, checked, onChange, disabled = false }) {
  return (
    <label className="settings-toggle">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
        {disabled ? <small className="settings-availability-note">{FUTURE_SETTING_NOTE}</small> : null}
      </span>
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          if (!disabled) onChange?.(event.target.checked);
        }}
      />
    </label>
  );
}

export default function SettingsPage() {
  const appSettings = useStore((state) => state.appSettings);
  const updateAppSettings = useStore((state) => state.updateAppSettings);
  const preferences = appSettings.dashboardPreferences;

  return (
    <PageContainer className="settings-page">
      <PageHeader
        kicker="ตั้งค่า"
        title="ค่าการใช้งานพื้นที่ทำงาน"
        subtitle="จัดการธีม ความหนาแน่น รูปแบบข้อมูล และค่าเริ่มต้นของแดชบอร์ด"
      />

      <div className="settings-grid">
        <section className="settings-panel">
          <div className="settings-panel-head">
            <span>รูปลักษณ์</span>
            <h2>ธีมและความหนาแน่น</h2>
          </div>
          <div className="settings-field-grid">
            <SettingSelect
              label="ธีม"
              value={appSettings.theme}
              options={SETTINGS_OPTIONS.theme}
              onChange={(theme) => updateAppSettings({ theme })}
            />
            <SettingSelect
              label="ความหนาแน่น"
              value={appSettings.density}
              options={SETTINGS_OPTIONS.density}
              onChange={(density) => updateAppSettings({ density })}
            />
          </div>
        </section>

        <section className="settings-panel">
          <div className="settings-panel-head">
            <span>รูปแบบข้อมูล</span>
            <h2>วันที่และตัวเลข</h2>
          </div>
          <div className="settings-field-grid">
            <SettingSelect
              label="รูปแบบวันที่"
              value={appSettings.dateFormat}
              options={SETTINGS_OPTIONS.dateFormat}
              disabled
            />
            <SettingSelect
              label="รูปแบบตัวเลข"
              value={appSettings.numberFormat}
              options={SETTINGS_OPTIONS.numberFormat}
              disabled
            />
          </div>
        </section>

        <section className="settings-panel settings-panel-wide">
          <div className="settings-panel-head">
            <span>ค่าเริ่มต้นแดชบอร์ด</span>
            <h2>ค่าเริ่มต้นของพื้นที่วิเคราะห์</h2>
          </div>
          <div className="settings-field-grid">
            <SettingSelect
              label="พื้นที่วิเคราะห์เริ่มต้น"
              value={preferences.defaultCanvasPreset}
              options={SETTINGS_OPTIONS.defaultCanvasPreset}
              disabled
            />
          </div>
          <div className="settings-toggle-grid">
            <SettingToggle
              label="แสดงหัววิดเจ็ต"
              description="แสดงชื่อกราฟและปุ่มการทำงานของวิดเจ็ตเป็นค่าเริ่มต้น"
              checked={preferences.showWidgetHeaders}
              disabled
            />
            <SettingToggle
              label="แสดงท้ายวิดเจ็ต"
              description="แสดงแหล่งข้อมูลและจำนวนแถวใต้ตัววิดเจ็ต"
              checked={preferences.showWidgetFooters}
              disabled
            />
            <SettingToggle
              label="รีเฟรชแดชบอร์ดอัตโนมัติ"
              description="เตรียมแดชบอร์ดให้รีเฟรชข้อมูลเมื่อระบบหลังบ้านรองรับ"
              checked={preferences.autoRefresh}
              disabled
            />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
