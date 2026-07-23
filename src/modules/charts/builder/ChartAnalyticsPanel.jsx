import React from "react";

const SUPPORTED_TREND_FAMILIES = new Set(["bar", "line", "area", "scatter"]);
const SUPPORTED_FORECAST_FAMILIES = new Set(["bar", "line", "area"]);

const DEFAULT_ANALYTICS = {
  trend: { enabled: false, color: "#2563eb", label: "เส้นแนวโน้ม" },
  target: { enabled: false, value: 1000000, label: "เป้าหมาย", color: "#22c55e" },
  threshold: {
    enabled: false,
    greenMin: 900000,
    yellowMin: 600000,
    redMin: 0,
    greenColor: "rgba(34, 197, 94, 0.12)",
    yellowColor: "rgba(245, 158, 11, 0.14)",
    redColor: "rgba(239, 68, 68, 0.12)",
  },
  forecast: { enabled: false, periods: 3, window: 3, color: "#7c3aed", label: "คาดการณ์" },
  reference: { enabled: false, mode: "static", value: 750000, label: "เส้นอ้างอิง", color: "#64748b" },
};

function mergeAnalytics(value = {}) {
  return {
    trend: { ...DEFAULT_ANALYTICS.trend, ...(value.trend ?? {}) },
    target: { ...DEFAULT_ANALYTICS.target, ...(value.target ?? {}) },
    threshold: { ...DEFAULT_ANALYTICS.threshold, ...(value.threshold ?? {}) },
    forecast: { ...DEFAULT_ANALYTICS.forecast, ...(value.forecast ?? {}) },
    reference: { ...DEFAULT_ANALYTICS.reference, ...(value.reference ?? {}) },
  };
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="builder-v3-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function NumberField({ label, value, onChange, min, max, step = 1 }) {
  return (
    <label className="builder-v3-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label className="builder-v3-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="builder-v3-field">
      <span>{label}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export default function ChartAnalyticsPanel({ template, settings = {}, onSettingChange }) {
  const analytics = mergeAnalytics(settings.analytics);
  const family = template?.family ?? "";
  const supportsTrend = SUPPORTED_TREND_FAMILIES.has(family);
  const supportsForecast = SUPPORTED_FORECAST_FAMILIES.has(family);
  const supportsLines = supportsTrend;

  function updateSection(section, patch) {
    onSettingChange("analytics", {
      ...analytics,
      [section]: {
        ...analytics[section],
        ...patch,
      },
    });
  }

  if (!supportsTrend && !supportsForecast && !supportsLines) {
    return (
      <section className="builder-v3-panel builder-v3-analytics-settings-panel">
        <div className="builder-v3-section-head">
          <div>
            <span className="builder-v3-kicker">วิเคราะห์</span>
            <h2 className="builder-v3-title">ตัวเลือกวิเคราะห์ยังไม่รองรับกราฟนี้</h2>
          </div>
        </div>
        <div className="builder-v3-validation-card">
          <p>เลือกกราฟแท่ง กราฟเส้น กราฟพื้นที่ หรือกราฟกระจายเพื่อใช้เส้นแนวโน้ม เป้าหมาย เกณฑ์ และการคาดการณ์</p>
        </div>
      </section>
    );
  }

  return (
    <section className="builder-v3-panel builder-v3-analytics-settings-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">วิเคราะห์</span>
          <h2 className="builder-v3-title">เพิ่มชั้นวิเคราะห์</h2>
        </div>
      </div>

      {supportsTrend ? (
        <details className="builder-v3-subsection builder-v3-format-accordion" name="builder-config-accordion" open>
          <summary className="builder-v3-inline-meta">
            <strong>Trend</strong>
            <span>เพิ่มเส้นแนวโน้มเชิงเส้นบนตัวอย่างกราฟ</span>
          </summary>
          <div className="builder-v3-toggle-grid">
            <Toggle label="แสดงเส้นแนวโน้ม" checked={analytics.trend.enabled} onChange={(enabled) => updateSection("trend", { enabled })} />
          </div>
          <div className="builder-v3-form-grid">
            <TextField label="ชื่อเส้น" value={analytics.trend.label} onChange={(label) => updateSection("trend", { label })} />
            <ColorField label="สี" value={analytics.trend.color} onChange={(color) => updateSection("trend", { color })} />
          </div>
        </details>
      ) : null}

      {supportsLines ? (
        <details className="builder-v3-subsection builder-v3-format-accordion" name="builder-config-accordion">
          <summary className="builder-v3-inline-meta">
            <strong>Target</strong>
            <span>กำหนดเส้นเป้าหมายตัวเลขและป้ายกำกับ</span>
          </summary>
          <div className="builder-v3-toggle-grid">
            <Toggle label="แสดงเส้นเป้าหมาย" checked={analytics.target.enabled} onChange={(enabled) => updateSection("target", { enabled })} />
          </div>
          <div className="builder-v3-form-grid">
            <NumberField label="ค่าเป้าหมาย" value={analytics.target.value} onChange={(value) => updateSection("target", { value })} />
            <TextField label="ป้ายกำกับ" value={analytics.target.label} onChange={(label) => updateSection("target", { label })} />
            <ColorField label="สี" value={analytics.target.color} onChange={(color) => updateSection("target", { color })} />
          </div>
        </details>
      ) : null}

      {supportsLines ? (
        <details className="builder-v3-subsection builder-v3-format-accordion" name="builder-config-accordion">
          <summary className="builder-v3-inline-meta">
            <strong>Threshold</strong>
            <span>แสดงแถบสีเขียว เหลือง แดงตามช่วงค่า</span>
          </summary>
          <div className="builder-v3-toggle-grid">
            <Toggle label="แสดง Threshold bands" checked={analytics.threshold.enabled} onChange={(enabled) => updateSection("threshold", { enabled })} />
          </div>
          <div className="builder-v3-form-grid">
            <NumberField label="แดงเริ่มที่" value={analytics.threshold.redMin} onChange={(redMin) => updateSection("threshold", { redMin })} />
            <NumberField label="เหลืองเริ่มที่" value={analytics.threshold.yellowMin} onChange={(yellowMin) => updateSection("threshold", { yellowMin })} />
            <NumberField label="เขียวเริ่มที่" value={analytics.threshold.greenMin} onChange={(greenMin) => updateSection("threshold", { greenMin })} />
          </div>
        </details>
      ) : null}

      {supportsForecast ? (
        <details className="builder-v3-subsection builder-v3-format-accordion" name="builder-config-accordion">
          <summary className="builder-v3-inline-meta">
            <strong>Forecast</strong>
            <span>คาดการณ์ค่าถัดไปด้วย moving average</span>
          </summary>
          <div className="builder-v3-toggle-grid">
            <Toggle label="แสดงการคาดการณ์" checked={analytics.forecast.enabled} onChange={(enabled) => updateSection("forecast", { enabled })} />
          </div>
          <div className="builder-v3-form-grid">
            <NumberField label="จำนวนช่วงคาดการณ์" min={1} max={12} value={analytics.forecast.periods} onChange={(periods) => updateSection("forecast", { periods })} />
            <NumberField label="Moving average window" min={1} max={12} value={analytics.forecast.window} onChange={(windowValue) => updateSection("forecast", { window: windowValue })} />
            <TextField label="ชื่อเส้น" value={analytics.forecast.label} onChange={(label) => updateSection("forecast", { label })} />
            <ColorField label="สี" value={analytics.forecast.color} onChange={(color) => updateSection("forecast", { color })} />
          </div>
        </details>
      ) : null}

      {supportsLines ? (
        <details className="builder-v3-subsection builder-v3-format-accordion" name="builder-config-accordion">
          <summary className="builder-v3-inline-meta">
            <strong>Reference</strong>
            <span>เพิ่มเส้นอ้างอิงแบบค่าคงที่หรือค่าเฉลี่ย</span>
          </summary>
          <div className="builder-v3-toggle-grid">
            <Toggle label="แสดงเส้นอ้างอิง" checked={analytics.reference.enabled} onChange={(enabled) => updateSection("reference", { enabled })} />
          </div>
          <div className="builder-v3-form-grid">
            <label className="builder-v3-field">
              <span>ชนิดค่า</span>
              <select value={analytics.reference.mode} onChange={(event) => updateSection("reference", { mode: event.target.value })}>
                <option value="static">ค่าคงที่</option>
                <option value="average">ค่าเฉลี่ยจากข้อมูล</option>
              </select>
            </label>
            <NumberField label="ค่าอ้างอิง" value={analytics.reference.value} onChange={(value) => updateSection("reference", { value })} />
            <TextField label="ป้ายกำกับ" value={analytics.reference.label} onChange={(label) => updateSection("reference", { label })} />
            <ColorField label="สี" value={analytics.reference.color} onChange={(color) => updateSection("reference", { color })} />
          </div>
        </details>
      ) : null}
    </section>
  );
}
