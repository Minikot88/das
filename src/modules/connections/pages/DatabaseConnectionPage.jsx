import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, PageHeader } from "@app/layouts/Layout";
import {
  CONNECTION_TABS,
  DATABASE_TYPE_OPTIONS,
  buildConnectionUrl,
  createDefaultConnectionForm,
  getDatabaseType,
} from "@modules/connections/config/databaseConnectionDefaults";
import {
  createConnectionProfile,
  deleteDatabaseConnection,
  loadDatabaseConnections,
  sanitizeConnectionMetadata,
  sanitizeConnectionUrl,
  upsertDatabaseConnection,
} from "@modules/connections/persistence/databaseConnectionStorage";
import "@/styles/databaseConnection.css";

const AUTH_OPTIONS = [
  { value: "username-password", label: "Username / Password" },
  { value: "none", label: "No Authentication" },
  { value: "token", label: "Token" },
  { value: "oauth", label: "OAuth / Service Account" },
];

const SSL_MODES = ["Disable", "Allow", "Prefer", "Require", "Verify CA", "Verify Full"];
const DATABASE_GROUPS = [
  { label: "Relational", ids: ["postgresql", "mysql", "mariadb", "sqlserver", "sqlite", "oracle"] },
  { label: "NoSQL", ids: ["mongodb"] },
  { label: "Files / Cloud", ids: ["google-sheets", "csv-excel"] },
];
const TAB_HELP = {
  main: "กำหนด endpoint และข้อมูลยืนยันตัวตนของ connection profile",
  advanced: "ตั้งค่าพฤติกรรมการอ่านข้อมูลและ timeout สำหรับ demo connector",
  ssl: "กำหนด SSL certificate และ mode ก่อนเชื่อมต่อจริงใน backend phase",
  ssh: "ตั้งค่า tunnel สำหรับ environment ที่ต้องเข้าผ่าน bastion host",
  driver: "ตรวจสอบ driver metadata และ action ที่ต้องใช้ backend ในอนาคต",
  preview: "ตรวจสอบ config ที่จะบันทึกก่อนนำไปใช้กับ dataset",
};

function getGroupedDatabaseTypes() {
  return DATABASE_GROUPS.map((group) => ({
    ...group,
    items: group.ids.map((id) => DATABASE_TYPE_OPTIONS.find((type) => type.id === id)).filter(Boolean),
  })).filter((group) => group.items.length);
}

function updateNested(object, key, value) {
  return {
    ...object,
    [key]: value,
  };
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildPreviewConfig(form, type, status) {
  return sanitizeConnectionMetadata({
    name: form.connectionName,
    type: type.id,
    typeName: type.name,
    mode: form.connectionMode,
    host: form.host,
    port: form.port,
    database: form.database,
    url: buildConnectionUrl(form, type),
    filePath: form.filePath,
    sheetUrl: form.sheetUrl,
    authType: form.authType,
    username: form.username,
    passwordSaved: Boolean(form.savePassword),
    ssl: form.ssl,
    ssh: form.ssh,
    advanced: form.advanced,
    workspace: form.workspace,
    tags: form.tags,
    status: status?.type ?? "draft",
    note: "Demo mode: ยังไม่ได้เชื่อมต่อ backend จริง",
  });
}

function validateConnection(form, type) {
  const errors = {};
  const warnings = [];
  const portNumber = Number(form.port);

  if (type.mode === "host" && form.connectionMode === "host") {
    if (!form.host.trim()) errors.host = "Host จำเป็นต้องระบุ";
    if (!form.port.trim() || !Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
      errors.port = "Port ต้องเป็นตัวเลข 1-65535";
    }
    if (!form.database.trim()) errors.database = "Database จำเป็นต้องระบุ";
  }

  if ((form.connectionMode === "url" || type.mode === "connectionString") && !form.url.trim()) {
    errors.url = "Connection URL จำเป็นต้องระบุ";
  }

  if (type.mode === "file" && !form.filePath.trim()) errors.filePath = "File path จำเป็นต้องระบุ";
  if (type.mode === "sheet" && !form.sheetUrl.trim()) errors.sheetUrl = "Google Sheet URL จำเป็นต้องระบุ";
  if (type.mode === "upload" && !form.filePath.trim()) errors.filePath = "เลือกไฟล์หรือระบุ path สำหรับ demo";

  if (form.authType === "username-password" && !form.username.trim()) {
    errors.username = "Username จำเป็นสำหรับการยืนยันตัวตนแบบ Username / Password";
  }

  if (form.authType === "username-password" && !form.password.trim()) {
    warnings.push("ยังไม่ได้ใส่ password: demo mode อนุญาตให้ทดสอบ localhost ได้ แต่จะไม่บันทึกรหัสผ่านจริง");
  }

  if (form.ssl.enabled && form.ssl.mode === "Verify Full" && !form.ssl.caCertificate.trim()) {
    warnings.push("SSL Verify Full ควรระบุ CA certificate ก่อนเชื่อมต่อจริง");
  }

  if (form.ssh.enabled) {
    if (!form.ssh.host.trim()) errors.sshHost = "SSH host จำเป็นเมื่อเปิด SSH tunnel";
    if (!form.ssh.user.trim()) errors.sshUser = "SSH user จำเป็นเมื่อเปิด SSH tunnel";
  }

  return { errors, warnings, valid: Object.keys(errors).length === 0 };
}

function createFormFromProfile(profile) {
  const type = getDatabaseType(profile.type);
  const defaults = createDefaultConnectionForm(type.id);
  return {
    ...defaults,
    ...profile,
    type: type.id,
    connectionName: profile.name,
    password: "",
    savePassword: false,
    ssl: { ...defaults.ssl, ...(profile.ssl ?? {}) },
    ssh: { ...defaults.ssh, ...(profile.ssh ?? {}) },
    advanced: profile.advanced ?? defaults.advanced,
  };
}

function Field({ label, error, helper, children }) {
  return (
    <label className={`db-field${error ? " is-error" : ""}`}>
      <span>{label}</span>
      {children}
      {error ? <small className="db-field-error">{error}</small> : null}
      {!error && helper ? <small>{helper}</small> : null}
    </label>
  );
}

function statusLabel(status) {
  if (status?.type === "success") return "Demo success";
  if (status?.type === "error") return "Failed";
  if (status?.type === "demo") return "Demo";
  return "Not tested";
}

function statusClass(status) {
  if (status?.type === "success") return "is-success";
  if (status?.type === "error") return "is-error";
  if (status?.type === "demo") return "is-demo";
  return "is-idle";
}

export default function DatabaseConnectionPage() {
  const navigate = useNavigate();
  const [selectedTypeId, setSelectedTypeId] = useState("postgresql");
  const [activeTab, setActiveTab] = useState("main");
  const [form, setForm] = useState(() => createDefaultConnectionForm("postgresql"));
  const [savedConnections, setSavedConnections] = useState(() => loadDatabaseConnections());
  const [validation, setValidation] = useState({ errors: {}, warnings: [], valid: true });
  const [testStatus, setTestStatus] = useState(null);
  const [notice, setNotice] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const selectedType = getDatabaseType(selectedTypeId);
  const previewConfig = useMemo(
    () => buildPreviewConfig(form, selectedType, testStatus),
    [form, selectedType, testStatus]
  );
  const connectionUrl = sanitizeConnectionUrl(buildConnectionUrl(form, selectedType));
  const groupedDatabaseTypes = useMemo(() => getGroupedDatabaseTypes(), []);
  const profileSummary = useMemo(() => ([
    ["Database type", selectedType.name],
    ["Host", form.host || form.filePath || form.sheetUrl || "-"],
    ["Port", form.port || "-"],
    ["Database", form.database || "-"],
    ["Authentication", AUTH_OPTIONS.find((option) => option.value === form.authType)?.label ?? form.authType],
    ["SSL", form.ssl.enabled ? form.ssl.mode : "Off"],
    ["SSH", form.ssh.enabled ? `${form.ssh.host || "tunnel"}:${form.ssh.port || "22"}` : "Off"],
    ["Profile", form.connectionName || "-"],
  ]), [form, selectedType]);

  function patchForm(patch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function patchSection(section, patch) {
    setForm((current) => ({ ...current, [section]: updateNested(current[section], Object.keys(patch)[0], Object.values(patch)[0]) }));
  }

  function handleTypeChange(typeId) {
    setSelectedTypeId(typeId);
    setActiveTab("main");
    setForm(createDefaultConnectionForm(typeId));
    setValidation({ errors: {}, warnings: [], valid: true });
    setTestStatus(null);
  }

  function runConnectionTest(targetForm = form, targetType = selectedType) {
    const result = validateConnection(targetForm, targetType);
    setValidation(result);
    if (!result.valid) {
      setTestStatus({
        type: "error",
        title: "ทดสอบการเชื่อมต่อไม่ผ่าน",
        message: Object.values(result.errors)[0] ?? "ตรวจสอบข้อมูล connection อีกครั้ง",
      });
      return false;
    }

    setTestStatus({
      type: "demo",
      title: "เชื่อมต่อสำเร็จ",
      message: "การจำลองการเชื่อมต่อสำเร็จ · 42ms เป็นค่าตัวอย่าง",
      latency: "42ms (ตัวอย่าง)",
      server: targetType.mode === "host" ? `${targetForm.host}:${targetForm.port}` : sanitizeConnectionUrl(buildConnectionUrl(targetForm, targetType)),
      database: targetType.name,
      warnings: result.warnings,
    });
    return true;
  }

  function handleSaveProfile() {
    const result = validateConnection(form, selectedType);
    setValidation(result);
    if (!result.valid) {
      setTestStatus({
        type: "error",
        title: "ยังบันทึกไม่ได้",
        message: Object.values(result.errors)[0] ?? "กรุณาตรวจสอบข้อมูล connection",
      });
      return;
    }

    const profile = createConnectionProfile({
      form,
      type: selectedType,
      status: "demo",
      lastTestedAt: testStatus?.type === "success" ? new Date().toISOString() : null,
    });
    const nextConnections = upsertDatabaseConnection(profile);
    if (!nextConnections) {
      setNotice({
        title: "บันทึก connection profile ไม่สำเร็จ",
        message: "เบราว์เซอร์ไม่อนุญาตให้เข้าถึงพื้นที่จัดเก็บ โปรดลองอีกครั้งหลังเปิดสิทธิ์ site data",
      });
      return;
    }
    setSavedConnections(nextConnections);
    patchForm({ id: profile.id, createdAt: profile.createdAt });
    setNotice({
      title: "บันทึก connection profile แล้ว",
      message: "โปรไฟล์ถูกเก็บในเครื่องสำหรับ demo และยังไม่ได้ส่งไป backend",
    });
  }

  function handleLoadProfile(profile) {
    const nextType = getDatabaseType(profile.type);
    setSelectedTypeId(nextType.id);
    setForm(createFormFromProfile(profile));
    setActiveTab("main");
    setTestStatus({
      type: "success",
      title: "โหลด profile แล้ว",
      message: `${profile.name} พร้อมสำหรับทดสอบแบบ demo`,
      latency: null,
      server: profile.host ? `${profile.host}:${profile.port}` : profile.url || profile.filePath || profile.sheetUrl,
      database: nextType.name,
    });
  }

  function handleDuplicateProfile(profile) {
    const duplicated = {
      ...profile,
      id: `db-${Date.now()}`,
      name: `${profile.name} Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextConnections = upsertDatabaseConnection(duplicated);
    if (!nextConnections) {
      setNotice({ title: "ทำสำเนาไม่สำเร็จ", message: "ไม่สามารถเขียนข้อมูลลงพื้นที่จัดเก็บของเบราว์เซอร์" });
      return;
    }
    setSavedConnections(nextConnections);
    setNotice({ title: "ทำสำเนา profile แล้ว", message: duplicated.name });
  }

  function handleTestProfile(profile) {
    const nextType = getDatabaseType(profile.type);
    const nextForm = createFormFromProfile(profile);
    setSelectedTypeId(nextType.id);
    setForm(nextForm);
    setActiveTab("main");
    runConnectionTest(nextForm, nextType);
  }

  function handleDeleteProfile(profileId) {
    const nextConnections = deleteDatabaseConnection(profileId);
    if (!nextConnections) {
      setNotice({ title: "ลบ profile ไม่สำเร็จ", message: "ไม่สามารถเขียนข้อมูลลงพื้นที่จัดเก็บของเบราว์เซอร์" });
      return;
    }
    setSavedConnections(nextConnections);
    setNotice({ title: "ลบ connection profile แล้ว", message: "ลบเฉพาะข้อมูล demo ในเครื่อง" });
  }

  async function handleCopyConfig() {
    const text = JSON.stringify(previewConfig, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ title: "คัดลอก config แล้ว", message: "นำ JSON config ไปใช้ต่อได้ทันที" });
    } catch {
      setNotice({ title: "คัดลอกอัตโนมัติไม่ได้", message: text });
    }
  }

  function handleExportProfile() {
    downloadJson(`${form.connectionName || selectedType.name}-profile.json`, previewConfig);
    setNotice({ title: "ส่งออก profile JSON แล้ว", message: "ไฟล์ config ถูกดาวน์โหลดจาก browser" });
  }

  function renderMainTab() {
    const mode = selectedType.mode;
    const errors = validation.errors;
    const showHostFields = mode === "host" && form.connectionMode === "host";
    const showUrlField = form.connectionMode === "url" || mode === "connectionString";

    return (
      <div className="db-tab-panel">
        {mode === "host" ? (
          <fieldset className="db-radio-row">
            <legend>Connection mode</legend>
            <label>
              <input type="radio" checked={form.connectionMode === "host"} onChange={() => patchForm({ connectionMode: "host" })} />
              Host
            </label>
            <label>
              <input type="radio" checked={form.connectionMode === "url"} onChange={() => patchForm({ connectionMode: "url" })} />
              URL
            </label>
          </fieldset>
        ) : null}

        {showHostFields ? (
          <div className="db-form-grid">
            <Field label="Host" error={errors.host} helper="เช่น localhost หรือ db.company.local">
              <input value={form.host} onChange={(event) => patchForm({ host: event.target.value })} />
            </Field>
            <Field label="Port" error={errors.port}>
              <input inputMode="numeric" value={form.port} onChange={(event) => patchForm({ port: event.target.value })} />
            </Field>
            <Field label="Database" error={errors.database}>
              <input value={form.database} onChange={(event) => patchForm({ database: event.target.value })} />
            </Field>
            <label className="db-check-row">
              <input type="checkbox" checked={form.showAllDatabases} onChange={(event) => patchForm({ showAllDatabases: event.target.checked })} />
              <span>แสดงฐานข้อมูลทั้งหมดเมื่อเชื่อมต่อจริง</span>
            </label>
          </div>
        ) : null}

        {showUrlField ? (
          <Field label={selectedType.id === "mongodb" ? "Connection string" : "JDBC / Connection URL"} error={errors.url} helper={connectionUrl}>
            <input value={form.url} onChange={(event) => patchForm({ url: event.target.value })} />
          </Field>
        ) : null}

        {mode === "file" || mode === "upload" ? (
          <Field label={mode === "file" ? "Database file path" : "CSV / Excel file"} error={errors.filePath} helper="Demo mode ใช้ path เป็น placeholder ยังไม่อ่านไฟล์จริงจากหน้านี้">
            <div className="db-inline-input">
              <input value={form.filePath} onChange={(event) => patchForm({ filePath: event.target.value })} />
              <button type="button" onClick={() => setNotice({ title: "เลือกไฟล์", message: "File picker จริงจะเชื่อมต่อใน backend/file connector phase" })}>
                เลือกไฟล์
              </button>
            </div>
          </Field>
        ) : null}

        {mode === "sheet" ? (
          <Field label="Google Sheet URL" error={errors.sheetUrl} helper="วาง URL ของ spreadsheet สำหรับ demo profile">
            <input value={form.sheetUrl} onChange={(event) => patchForm({ sheetUrl: event.target.value })} />
          </Field>
        ) : null}

        <div className="db-section-title">Authentication</div>
        <div className="db-form-grid">
          <Field label="Authentication">
            <select value={form.authType} onChange={(event) => patchForm({ authType: event.target.value })}>
              {AUTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Username" error={errors.username}>
            <input disabled={form.authType === "none"} value={form.username} onChange={(event) => patchForm({ username: event.target.value })} />
          </Field>
          <Field label="Password / Token">
            <div className="db-inline-input">
              <input
                disabled={form.authType === "none"}
                type={passwordVisible ? "text" : "password"}
                value={form.password}
                onChange={(event) => patchForm({ password: event.target.value })}
              />
              <button type="button" onClick={() => setPasswordVisible((current) => !current)}>
                {passwordVisible ? "ซ่อน" : "แสดง"}
              </button>
            </div>
          </Field>
          <label className="db-check-row">
            <input type="checkbox" checked={false} disabled />
            <span>ไม่บันทึกรหัสผ่านหรือ Token — ใช้เฉพาะในฟอร์มของเซสชันนี้</span>
          </label>
        </div>

        <div className="db-section-title">Profile</div>
        <div className="db-form-grid">
          <Field label="Connection name">
            <input value={form.connectionName} onChange={(event) => patchForm({ connectionName: event.target.value })} />
          </Field>
          <Field label="Workspace">
            <input value={form.workspace} onChange={(event) => patchForm({ workspace: event.target.value })} />
          </Field>
          <Field label="Tags">
            <input value={form.tags} onChange={(event) => patchForm({ tags: event.target.value })} />
          </Field>
        </div>
      </div>
    );
  }

  function renderAdvancedTab() {
    return (
      <div className="db-tab-panel">
        <div className="db-form-grid is-three">
          {[
            ["connectionTimeout", "Connection timeout"],
            ["readTimeout", "Read timeout"],
            ["fetchSize", "Fetch size"],
            ["schema", "Schema"],
            ["defaultRole", "Default role"],
            ["applicationName", "Application name"],
            ["timezone", "Timezone"],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input value={form.advanced[key]} onChange={(event) => patchSection("advanced", { [key]: event.target.value })} />
            </Field>
          ))}
        </div>
        <div className="db-toggle-list">
          {[
            ["keepAlive", "Keep alive"],
            ["autoReconnect", "Auto reconnect"],
            ["readOnly", "Read only mode"],
            ["useCompression", "Use compression"],
          ].map(([key, label]) => (
            <label key={key} className="db-switch-row">
              <span>{label}</span>
              <input type="checkbox" checked={Boolean(form.advanced[key])} onChange={(event) => patchSection("advanced", { [key]: event.target.checked })} />
            </label>
          ))}
        </div>
      </div>
    );
  }

  function renderSslTab() {
    return (
      <div className="db-tab-panel">
        <div className="db-disabled-note">
          เปิด SSL เพื่อกำหนด certificate สำหรับ connection นี้
        </div>
        <label className="db-switch-row">
          <span>Use SSL</span>
          <input type="checkbox" checked={form.ssl.enabled} onChange={(event) => patchSection("ssl", { enabled: event.target.checked })} />
        </label>
        <div className="db-form-grid">
          <Field label="SSL mode">
            <select disabled={!form.ssl.enabled} value={form.ssl.mode} onChange={(event) => patchSection("ssl", { mode: event.target.value })}>
              {SSL_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </Field>
          <Field label="CA certificate file">
            <input disabled={!form.ssl.enabled} value={form.ssl.caCertificate} onChange={(event) => patchSection("ssl", { caCertificate: event.target.value })} />
          </Field>
          <Field label="Client certificate">
            <input disabled={!form.ssl.enabled} value={form.ssl.clientCertificate} onChange={(event) => patchSection("ssl", { clientCertificate: event.target.value })} />
          </Field>
          <Field label="Client key">
            <input disabled={!form.ssl.enabled} value={form.ssl.clientKey} onChange={(event) => patchSection("ssl", { clientKey: event.target.value })} />
          </Field>
        </div>
      </div>
    );
  }

  function renderSshTab() {
    return (
      <div className="db-tab-panel">
        <div className="db-disabled-note">
          ใช้ SSH tunnel เมื่อฐานข้อมูลอยู่ใน private network
        </div>
        <label className="db-switch-row">
          <span>Use SSH tunnel</span>
          <input type="checkbox" checked={form.ssh.enabled} onChange={(event) => patchSection("ssh", { enabled: event.target.checked })} />
        </label>
        <div className="db-form-grid">
          <Field label="SSH host" error={validation.errors.sshHost}>
            <input disabled={!form.ssh.enabled} value={form.ssh.host} onChange={(event) => patchSection("ssh", { host: event.target.value })} />
          </Field>
          <Field label="SSH port">
            <input disabled={!form.ssh.enabled} value={form.ssh.port} onChange={(event) => patchSection("ssh", { port: event.target.value })} />
          </Field>
          <Field label="SSH user" error={validation.errors.sshUser}>
            <input disabled={!form.ssh.enabled} value={form.ssh.user} onChange={(event) => patchSection("ssh", { user: event.target.value })} />
          </Field>
          <Field label="Authentication method">
            <select disabled={!form.ssh.enabled} value={form.ssh.authMethod} onChange={(event) => patchSection("ssh", { authMethod: event.target.value })}>
              <option value="password">Password</option>
              <option value="private-key">Private Key</option>
            </select>
          </Field>
          <Field label="SSH password">
            <input disabled={!form.ssh.enabled || form.ssh.authMethod !== "password"} type="password" value={form.ssh.password} onChange={(event) => patchSection("ssh", { password: event.target.value })} />
          </Field>
          <Field label="Private key file">
            <input disabled={!form.ssh.enabled || form.ssh.authMethod !== "private-key"} value={form.ssh.privateKey} onChange={(event) => patchSection("ssh", { privateKey: event.target.value })} />
          </Field>
          <Field label="Local port">
            <input disabled={!form.ssh.enabled} value={form.ssh.localPort} onChange={(event) => patchSection("ssh", { localPort: event.target.value })} />
          </Field>
          <Field label="Remote host">
            <input disabled={!form.ssh.enabled} value={form.ssh.remoteHost} onChange={(event) => patchSection("ssh", { remoteHost: event.target.value })} />
          </Field>
          <Field label="Remote port">
            <input disabled={!form.ssh.enabled} value={form.ssh.remotePort} onChange={(event) => patchSection("ssh", { remotePort: event.target.value })} />
          </Field>
        </div>
      </div>
    );
  }

  function renderDriverTab() {
    return (
      <div className="db-tab-panel">
        <section className="db-driver-card">
          <dl className="db-driver-list">
            <div><dt>Driver name</dt><dd>{selectedType.defaults.driverName}</dd></div>
            <div><dt>Driver version</dt><dd>{selectedType.defaults.driverVersion}</dd></div>
            <div><dt>Class name</dt><dd>{selectedType.defaults.className}</dd></div>
            <div><dt>Driver status</dt><dd>Demo metadata only</dd></div>
          </dl>
        </section>
        <div className="db-driver-actions">
          <button type="button" onClick={() => setNotice({ title: "Driver Settings", message: "การตั้งค่า driver จริงจะเปิดใน backend integration phase" })}>Driver Settings</button>
          <button type="button" onClick={() => setNotice({ title: "Download Driver", message: "ยังไม่ดาวน์โหลด driver จริงใน demo frontend" })}>Download Driver</button>
          <button type="button" onClick={() => setNotice({ title: "Driver License", message: "ข้อมูล license จะแสดงจาก driver registry ใน production" })}>Driver License</button>
        </div>
      </div>
    );
  }

  function renderPreviewTab() {
    return (
      <div className="db-tab-panel">
        <section className="db-preview-card">
          <strong>Connection summary</strong>
          <dl className="db-summary-list">
            <div><dt>Database type</dt><dd>{selectedType.name}</dd></div>
            <div><dt>Host</dt><dd>{form.host || "-"}</dd></div>
            <div><dt>Port</dt><dd>{form.port || "-"}</dd></div>
            <div><dt>Database</dt><dd>{form.database || "-"}</dd></div>
            <div><dt>Username</dt><dd>{form.username || "-"}</dd></div>
            <div><dt>Connection URL</dt><dd>{connectionUrl}</dd></div>
            <div><dt>SSL</dt><dd>{form.ssl.enabled ? form.ssl.mode : "Off"}</dd></div>
            <div><dt>SSH</dt><dd>{form.ssh.enabled ? `${form.ssh.host}:${form.ssh.port}` : "Off"}</dd></div>
          </dl>
        </section>
        <div className="db-security-note">Preview, clipboard และไฟล์ส่งออกมีเฉพาะ metadata ที่ปลอดภัย ไม่รวมรหัสผ่าน Token certificate หรือ private key</div>
        <pre className="db-json-preview">{JSON.stringify(previewConfig, null, 2)}</pre>
        <div className="db-driver-actions">
          <button type="button" onClick={handleCopyConfig}>Copy Config</button>
          <button type="button" onClick={handleExportProfile}>Export Profile JSON</button>
        </div>
      </div>
    );
  }

  function renderActiveTab() {
    if (activeTab === "advanced") return renderAdvancedTab();
    if (activeTab === "ssl") return renderSslTab();
    if (activeTab === "ssh") return renderSshTab();
    if (activeTab === "driver") return renderDriverTab();
    if (activeTab === "preview") return renderPreviewTab();
    return renderMainTab();
  }

  return (
    <PageContainer className="database-connection-page">
      <PageHeader
        kicker="Database Connection"
        title="เชื่อมต่อฐานข้อมูล"
        subtitle="สร้าง profile และจำลองการทดสอบการเชื่อมต่อสำหรับชุดข้อมูลและแดชบอร์ด"
        className="db-page-header"
        actions={(
          <div className="db-header-actions">
            <button type="button" onClick={() => navigate("/datasets")}>กลับไปชุดข้อมูล</button>
            <button type="button" className="is-primary" onClick={handleSaveProfile}>บันทึกโปรไฟล์</button>
            <button type="button" onClick={() => runConnectionTest()}>จำลองการทดสอบการเชื่อมต่อ</button>
          </div>
        )}
      >
        <div className="db-header-strip">
          <span className="db-demo-badge">Demo Mode</span>
          <span>Database Connection Studio</span>
          <span>{selectedType.name}</span>
        </div>
      </PageHeader>

      <div className="db-connection-layout">
        <aside className="db-type-panel">
          <div className="db-panel-head">
            <span>ประเภทฐานข้อมูล</span>
            <strong>{DATABASE_TYPE_OPTIONS.length} connectors</strong>
          </div>
          <div className="db-type-list">
            {groupedDatabaseTypes.map((group) => (
              <section className="db-type-group" key={group.label}>
                <span className="db-type-group-label">{group.label}</span>
                {group.items.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className={`db-type-card${type.id === selectedTypeId ? " is-active" : ""}`}
                    onClick={() => handleTypeChange(type.id)}
                  >
                    <span className="db-type-icon" aria-hidden="true">{type.icon}</span>
                    <span className="db-type-copy">
                      <strong>{type.name}</strong>
                      <small>{type.description}</small>
                    </span>
                    <span className={`db-status-badge${type.status === "Future" ? " is-muted" : ""}`}>{type.status}</span>
                  </button>
                ))}
              </section>
            ))}
          </div>

          <section className="db-saved-panel">
            <div className="db-panel-head">
              <span>Saved Connections</span>
              <strong>{savedConnections.length}</strong>
            </div>
            {savedConnections.length ? (
              <div className="db-saved-list">
                {savedConnections.map((profile) => (
                  <article className="db-saved-card" key={profile.id}>
                    <div>
                      <strong>{profile.name}</strong>
                      <span>{profile.typeName || profile.type} · {profile.host || profile.database || profile.url || "local"}</span>
                      <small>ทดสอบล่าสุด {formatDate(profile.lastTestedAt)}</small>
                    </div>
                    <div className="db-saved-actions">
                      <button type="button" onClick={() => handleLoadProfile(profile)}>Load</button>
                      <button type="button" onClick={() => handleDuplicateProfile(profile)}>Duplicate</button>
                      <button type="button" onClick={() => handleTestProfile(profile)}>Test</button>
                      <button type="button" onClick={() => handleDeleteProfile(profile.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="db-empty-state">ยังไม่มี connection profile</div>
            )}
          </section>
        </aside>

        <section className="db-settings-panel" aria-label="ตั้งค่าการเชื่อมต่อข้อมูล">
          <header className="db-settings-head">
            <div>
              <span>{selectedType.name} connection settings</span>
              <h2>{form.connectionName}</h2>
              <p>{TAB_HELP[activeTab]}</p>
            </div>
            <span className="db-selected-logo" aria-hidden="true">{selectedType.icon}</span>
          </header>

          <div className="db-tabs" role="tablist" aria-label="Connection setting tabs">
            {CONNECTION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? "is-active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <section className="db-tab-surface" role="tabpanel">
            {renderActiveTab()}
          </section>

          {testStatus ? (
            <section className={`db-test-result is-${testStatus.type}`} role="status">
              <strong>{testStatus.title}</strong>
              <span>{testStatus.message}</span>
              {testStatus.type === "success" ? (
                <dl>
                  <div><dt>Latency</dt><dd>{testStatus.latency}</dd></div>
                  <div><dt>Database</dt><dd>{testStatus.database}</dd></div>
                  <div><dt>Server</dt><dd>{testStatus.server}</dd></div>
                </dl>
              ) : null}
              {testStatus.warnings?.map((warning) => <small key={warning}>{warning}</small>)}
              <small>Demo Mode: การทดสอบนี้จำลองผลลัพธ์ในหน้าเว็บ ยังไม่ได้เชื่อมต่อฐานข้อมูลจริง</small>
            </section>
          ) : (
            <section className="db-demo-note">
              <strong>Demo Mode</strong>
              <span>การทดสอบนี้จำลองผลลัพธ์ในหน้าเว็บ ยังไม่ได้เชื่อมต่อฐานข้อมูลจริง</span>
            </section>
          )}

          <footer className="db-action-bar">
            <button type="button" onClick={() => runConnectionTest()}>Test Connection</button>
            <button type="button" className="is-primary" onClick={handleSaveProfile}>Save Profile</button>
            <button type="button" onClick={() => navigate("/datasets")}>Cancel</button>
          </footer>
        </section>

        <aside className="db-summary-panel">
          <header className="db-summary-head">
            <div>
              <span>สรุปการเชื่อมต่อ</span>
              <strong>{selectedType.name}</strong>
            </div>
            <span className={`db-status-dot ${statusClass(testStatus)}`} aria-hidden="true" />
          </header>

          <section className={`db-status-card ${statusClass(testStatus)}`}>
            <small>Status</small>
            <strong>{statusLabel(testStatus)}</strong>
            <span>{testStatus?.message ?? "Demo profile ยังไม่ได้ทดสอบ"}</span>
          </section>

          <dl className="db-summary-list">
            {profileSummary.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>

          {testStatus?.type === "success" ? (
            <section className="db-mini-result">
              <strong>เชื่อมต่อสำเร็จ</strong>
              <span>Latency {testStatus.latency} · {testStatus.server}</span>
              <small>ผลลัพธ์นี้เป็นการจำลองในโหมด Demo</small>
            </section>
          ) : null}

          <section className="db-saved-panel is-summary">
            <div className="db-panel-head">
              <span>Connection Profiles</span>
              <strong>{savedConnections.length}</strong>
            </div>
            {savedConnections.length ? (
              <div className="db-profile-mini-list">
                {savedConnections.slice(0, 4).map((profile) => (
                  <article className="db-profile-mini" key={profile.id}>
                    <strong>{profile.name}</strong>
                    <span>{profile.typeName || profile.type} · {profile.host || profile.database || "local"}</span>
                    <small>{formatDate(profile.lastTestedAt)}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="db-empty-state">ยังไม่มี connection profile</div>
            )}
          </section>
        </aside>
      </div>

      {notice ? (
        <div className="db-modal-backdrop" role="presentation" onClick={() => setNotice(null)}>
          <section className="db-modal" role="dialog" aria-modal="true" aria-labelledby="db-modal-title" onClick={(event) => event.stopPropagation()}>
            <header>
              <strong id="db-modal-title">{notice.title}</strong>
              <button type="button" onClick={() => setNotice(null)} aria-label="ปิด">×</button>
            </header>
            <p>{notice.message}</p>
            <button type="button" className="is-primary" onClick={() => setNotice(null)}>รับทราบ</button>
          </section>
        </div>
      ) : null}
    </PageContainer>
  );
}
