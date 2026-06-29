import React from "react";
import { PageContainer, PageHeader } from "../components/layout/Layout";
import { useStore } from "../store/useStore";

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

function SettingSelect({ label, value, options, onChange }) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function SettingToggle({ label, description, checked, onChange }) {
  return (
    <label className="settings-toggle">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export default function SettingsPage() {
  const appSettings = useStore((state) => state.appSettings);
  const updateAppSettings = useStore((state) => state.updateAppSettings);
  const preferences = appSettings.dashboardPreferences;

  function updatePreference(key, value) {
    updateAppSettings({
      dashboardPreferences: {
        [key]: value,
      },
    });
  }

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
              onChange={(dateFormat) => updateAppSettings({ dateFormat })}
            />
            <SettingSelect
              label="รูปแบบตัวเลข"
              value={appSettings.numberFormat}
              options={SETTINGS_OPTIONS.numberFormat}
              onChange={(numberFormat) => updateAppSettings({ numberFormat })}
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
              onChange={(defaultCanvasPreset) => updatePreference("defaultCanvasPreset", defaultCanvasPreset)}
            />
          </div>
          <div className="settings-toggle-grid">
            <SettingToggle
              label="แสดงหัววิดเจ็ต"
              description="แสดงชื่อกราฟและปุ่มการทำงานของวิดเจ็ตเป็นค่าเริ่มต้น"
              checked={preferences.showWidgetHeaders}
              onChange={(value) => updatePreference("showWidgetHeaders", value)}
            />
            <SettingToggle
              label="แสดงท้ายวิดเจ็ต"
              description="แสดงแหล่งข้อมูลและจำนวนแถวใต้ตัววิดเจ็ต"
              checked={preferences.showWidgetFooters}
              onChange={(value) => updatePreference("showWidgetFooters", value)}
            />
            <SettingToggle
              label="รีเฟรชแดชบอร์ดอัตโนมัติ"
              description="เตรียมแดชบอร์ดให้รีเฟรชข้อมูลเมื่อระบบหลังบ้านรองรับ"
              checked={preferences.autoRefresh}
              onChange={(value) => updatePreference("autoRefresh", value)}
            />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
