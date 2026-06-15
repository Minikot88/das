import React from "react";

const PALETTE_OPTIONS = [
  { value: "chartjs", label: "Chart.js" },
  { value: "ocean", label: "มหาสมุทร" },
  { value: "sunset", label: "พระอาทิตย์ตก" },
  { value: "earth", label: "โลก" },
  { value: "neutral", label: "กลาง" },
];

const CARTESIAN_FAMILIES = new Set(["bar", "line", "area", "scatter", "bubble", "mixed"]);

function Toggle({ label, checked, onChange }) {
  return (
    <label className="builder-v3-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function Field({ label, children }) {
  return (
    <label className="builder-v3-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function firstMappingValue(mapping = {}, roles = []) {
  for (const role of roles) {
    const value = mapping?.[role];
    if (Array.isArray(value)) {
      const first = value.find(Boolean);
      if (first) return first;
      continue;
    }
    if (value) return value;
  }
  return "";
}

function getAxisTitleFallbacks(template, mapping = {}) {
  if (!CARTESIAN_FAMILIES.has(template?.family) || template?.variant === "floating") {
    return { xAxisTitle: "", yAxisTitle: "" };
  }

  const horizontal = template?.family === "bar" && (template?.variant === "horizontal" || template?.defaultSettings?.horizontal);
  const categoryField = firstMappingValue(mapping, ["x"]);
  const valueField = firstMappingValue(mapping, ["y", "value", "bar", "line", "measures", "size"]);

  return horizontal
    ? { xAxisTitle: valueField, yAxisTitle: categoryField }
    : { xAxisTitle: categoryField, yAxisTitle: valueField };
}

function SettingsAccordion({ title, description, open = false, children }) {
  return (
    <details className="builder-v3-subsection builder-v3-format-accordion" open={open}>
      <summary className="builder-v3-inline-meta">
        <strong>{title}</strong>
        <span>{description}</span>
      </summary>
      {children}
    </details>
  );
}

export default function ChartSettingsPanel({ template, mapping = {}, settings, onSettingChange }) {
  const allowStacked = ["bar", "area", "mixed"].includes(template?.family);
  const allowHorizontal = template?.family === "bar" && template?.variant !== "floating";
  const allowLineWidth = ["line", "area", "mixed", "scatter", "bubble", "radar"].includes(template?.family);
  const allowBarRadius = ["bar", "mixed"].includes(template?.family);
  const showAxisControls = CARTESIAN_FAMILIES.has(template?.family) && template?.variant !== "floating";
  const axisTitleFallbacks = getAxisTitleFallbacks(template, mapping);
  const xAxisTitleValue = settings.xAxisTitle || axisTitleFallbacks.xAxisTitle;
  const yAxisTitleValue = settings.yAxisTitle || axisTitleFallbacks.yAxisTitle;

  return (
    <>
      <SettingsAccordion title="รูปแบบ" description="ชื่อกราฟ คำอธิบาย และการแสดงผลหลัก" open>
        <div className="builder-v3-form-grid">
          <Field label="ชื่อกราฟ">
            <input
              value={settings.title}
              placeholder="เว้นว่างเพื่อใช้ชื่อเริ่มต้น"
              onChange={(event) => onSettingChange("title", event.target.value)}
            />
          </Field>
          <Field label="คำอธิบาย">
            <input value={settings.subtitle} onChange={(event) => onSettingChange("subtitle", event.target.value)} />
          </Field>
        </div>
        <div className="builder-v3-toggle-grid">
          <Toggle label="แสดงชื่อบนกราฟ" checked={settings.showTitle !== false} onChange={(value) => onSettingChange("showTitle", value)} />
          <Toggle label="เริ่มจากศูนย์" checked={settings.beginAtZero} onChange={(value) => onSettingChange("beginAtZero", value)} />
          {allowStacked ? <Toggle label="ซ้อนกัน" checked={settings.stacked} onChange={(value) => onSettingChange("stacked", value)} /> : null}
          {allowHorizontal ? <Toggle label="แนวนอน" checked={settings.horizontal} onChange={(value) => onSettingChange("horizontal", value)} /> : null}
        </div>
      </SettingsAccordion>

      <SettingsAccordion title="สี" description="ชุดสี พื้นหลัง และสีข้อความ">
        <div className="builder-v3-form-grid">
          <Field label="ชุดสี">
            <select value={settings.palette} onChange={(event) => onSettingChange("palette", event.target.value)}>
              {PALETTE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="พื้นหลังกราฟ">
            <input type="color" value={settings.backgroundColor} onChange={(event) => onSettingChange("backgroundColor", event.target.value)} />
          </Field>
          <Field label="สีชื่อกราฟ">
            <input type="color" value={settings.titleColor} onChange={(event) => onSettingChange("titleColor", event.target.value)} />
          </Field>
          <Field label="สีเส้นขอบ">
            <input type="color" value={settings.borderColor || "#1f2937"} onChange={(event) => onSettingChange("borderColor", event.target.value)} />
          </Field>
        </div>
      </SettingsAccordion>

      {showAxisControls ? (
        <SettingsAccordion title="แกน" description="ชื่อแกน สีป้ายแกน กริด และน้ำหนักเส้น">
          <div className="builder-v3-form-grid">
            <Field label="ชื่อแกน X">
              <input
                value={xAxisTitleValue}
                placeholder={axisTitleFallbacks.xAxisTitle || "ฟิลด์ X ที่แมปไว้"}
                onChange={(event) => onSettingChange("xAxisTitle", event.target.value)}
              />
            </Field>
            <Field label="ชื่อแกน Y">
              <input
                value={yAxisTitleValue}
                placeholder={axisTitleFallbacks.yAxisTitle || "ฟิลด์ Y ที่แมปไว้"}
                onChange={(event) => onSettingChange("yAxisTitle", event.target.value)}
              />
            </Field>
            <Field label="สีป้ายแกน">
              <input type="color" value={settings.axisLabelColor} onChange={(event) => onSettingChange("axisLabelColor", event.target.value)} />
            </Field>
          </div>
          <div className="builder-v3-toggle-grid">
            <Toggle
              label="แสดงชื่อแกน X"
              checked={settings.showXAxisTitle ?? Boolean(axisTitleFallbacks.xAxisTitle)}
              onChange={(value) => onSettingChange("showXAxisTitle", value)}
            />
            <Toggle
              label="แสดงชื่อแกน Y"
              checked={settings.showYAxisTitle ?? Boolean(axisTitleFallbacks.yAxisTitle)}
              onChange={(value) => onSettingChange("showYAxisTitle", value)}
            />
            <Toggle label="แสดงกริด" checked={settings.showGrid} onChange={(value) => onSettingChange("showGrid", value)} />
          </div>
          <div className="builder-v3-form-grid">
            {allowLineWidth ? (
              <Field label="ความหนาเส้น">
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={settings.lineWidth}
                  onChange={(event) => onSettingChange("lineWidth", Number(event.target.value))}
                />
              </Field>
            ) : null}
            {allowBarRadius ? (
              <Field label="รัศมีแท่งกราฟ">
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={settings.barBorderRadius}
                  onChange={(event) => onSettingChange("barBorderRadius", Number(event.target.value))}
                />
              </Field>
            ) : null}
          </div>
        </SettingsAccordion>
      ) : null}

      <SettingsAccordion title="Tooltip" description="ข้อมูลที่แสดงเมื่อชี้บนกราฟ">
        <div className="builder-v3-toggle-grid">
          <Toggle label="แสดง Tooltip" checked={settings.showTooltip !== false} onChange={(value) => onSettingChange("showTooltip", value)} />
        </div>
      </SettingsAccordion>

      <SettingsAccordion title="Legend" description="ตำแหน่งและการแสดงคำอธิบายสี">
        <div className="builder-v3-form-grid">
          <Field label="ตำแหน่ง">
            <select value={settings.legendPosition} onChange={(event) => onSettingChange("legendPosition", event.target.value)}>
              <option value="bottom">ล่าง</option>
              <option value="right">ขวา</option>
              <option value="top">บน</option>
              <option value="left">ซ้าย</option>
            </select>
          </Field>
        </div>
        <div className="builder-v3-toggle-grid">
          <Toggle label="แสดง Legend" checked={settings.showLegend} onChange={(value) => onSettingChange("showLegend", value)} />
        </div>
      </SettingsAccordion>
    </>
  );
}
