import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { PageContainer, PageHeader } from "@app/layouts/Layout";
import {
  CONNECTION_TABS,
  DATABASE_TYPE_OPTIONS,
  buildConnectionUrl,
  createDefaultConnectionForm,
  getDatabaseType,
} from "@modules/connections/config/databaseConnectionDefaults";
import { sanitizeConnectionMetadata, sanitizeConnectionUrl } from "@modules/connections/persistence/databaseConnectionStorage";
import { createServerConnection, deleteServerConnection, discoverConnectionSchema, listConnectionProfiles, testServerConnection } from "@modules/connections/api/connectionApi";
import { useStore } from "@app/store/useStore";
import { API_ACTIVE_PROJECT_KEY, getProjects, resolveApiActiveProject } from "@modules/projects";
import "@shared/styles/databaseConnection.css";

const AUTH_OPTIONS = [
  { value: "username-password", label: "Username / Password" },
];

const SSL_MODES = ["Disable", "Allow", "Prefer", "Require", "Verify CA", "Verify Full"];
const TAB_HELP = {
  main: "กำหนด endpoint และข้อมูลยืนยันตัวตนของ connection profile",
  advanced: "ตั้งค่าพฤติกรรมการอ่านข้อมูลและ timeout สำหรับ PostgreSQL",
  ssl: "กำหนด SSL certificate และ mode ก่อนเชื่อมต่อ PostgreSQL",
  ssh: "ตั้งค่า tunnel สำหรับ environment ที่ต้องเข้าผ่าน bastion host",
  preview: "ตรวจสอบ config ที่จะบันทึกก่อนนำไปใช้กับ dataset",
};

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
    url: buildConnectionUrl(form),
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
    note: "PostgreSQL connection profile; credentials are stored by the backend.",
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

  if (form.authType === "username-password" && !form.username.trim()) {
    errors.username = "Username จำเป็นสำหรับการยืนยันตัวตนแบบ Username / Password";
  }

  if (form.authType === "username-password" && !form.password.trim()) {
    errors.password = "Password จำเป็นสำหรับการเชื่อมต่อ PostgreSQL";
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
  if (status?.type === "success") return "Ready";
  if (status?.type === "error") return "Failed";
  return "Not tested";
}

function statusClass(status) {
  if (status?.type === "success") return "is-success";
  if (status?.type === "error") return "is-error";
  return "is-idle";
}

export default function DatabaseConnectionPage() {
  const navigate = useNavigate();
  const storeActiveProjectId = useStore((state) => state.activeProjectId);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [selectedTypeId, setSelectedTypeId] = useState("postgresql");
  const [activeTab, setActiveTab] = useState("main");
  const [form, setForm] = useState(() => createDefaultConnectionForm("postgresql"));
  const [savedConnections, setSavedConnections] = useState([]);
  const [validation, setValidation] = useState({ errors: {}, warnings: [], valid: true });
  const [testStatus, setTestStatus] = useState(null);
  const [notice, setNotice] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [schemaExplorer, setSchemaExplorer] = useState(null);
  const [schemaLoadingId, setSchemaLoadingId] = useState("");

  useEffect(() => {
    let active = true;
    getProjects()
      .then((items) => {
        if (!active) return;
        const selected = resolveApiActiveProject(Array.isArray(items) ? items : [], window.localStorage.getItem(API_ACTIVE_PROJECT_KEY), storeActiveProjectId);
        if (!selected) { setActiveProjectId(null); setSavedConnections([]); return; }
        window.localStorage.setItem(API_ACTIVE_PROJECT_KEY, selected.id);
        useStore.setState?.({ activeProjectId: selected.id });
        setActiveProjectId(selected.id);
      })
      .catch((error) => { if (active) { setActiveProjectId(null); setSavedConnections([]); setNotice({ title: "โหลด project ไม่สำเร็จ", message: error.message }); } });
    return () => { active = false; };
  }, [storeActiveProjectId]);

  useEffect(() => {
    if (!activeProjectId) return undefined;
    let active = true;
    listConnectionProfiles(activeProjectId)
      .then((profiles) => { if (active) setSavedConnections(profiles ?? []); })
      .catch((error) => { if (active) setNotice({ title: "โหลด connection profile ไม่สำเร็จ", message: error.message }); });
    return () => { active = false; };
  }, [activeProjectId]);

  const selectedType = getDatabaseType(selectedTypeId);
  const previewConfig = useMemo(
    () => buildPreviewConfig(form, selectedType, testStatus),
    [form, selectedType, testStatus]
  );
  const connectionUrl = sanitizeConnectionUrl(buildConnectionUrl(form));
  const profileSummary = useMemo(() => ([
    ["Database type", selectedType.name],
    ["Host", form.host || "-"],
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

  async function runConnectionTest(targetForm = form, targetType = selectedType) {
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

    try {
      const resultStatus = await testServerConnection(targetForm, targetForm.id);
      setTestStatus({ type: "success", title: "เชื่อมต่อสำเร็จ", message: "PostgreSQL ตอบสนองและผ่านนโยบายเครือข่าย", latency: `${resultStatus.durationMs}ms`, server: `${targetForm.host}:${targetForm.port}`, database: targetForm.database, warnings: result.warnings });
      return true;
    } catch (error) {
      setTestStatus({ type: "error", title: "ทดสอบการเชื่อมต่อไม่ผ่าน", message: error.message });
      return false;
    }
  }

  async function handleSaveProfile() {
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

    if (!activeProjectId) { setNotice({ title: "ยังบันทึกไม่ได้", message: "กรุณาเลือก Project ก่อนบันทึก connection" }); return; }
    try {
      const profile = await createServerConnection(form, activeProjectId);
      setSavedConnections((current) => [profile, ...current.filter((item) => item.id !== profile.id)]);
      patchForm({ id: profile.id, createdAt: profile.createdAt, password: "" });
      setNotice({ title: "บันทึก connection profile แล้ว", message: "Secret ถูกเข้ารหัสและเก็บที่ Backend โดยไม่บันทึกใน localStorage" });
    } catch (error) { setNotice({ title: "บันทึก connection profile ไม่สำเร็จ", message: error.message }); }
  }

  function handleLoadProfile(profile) {
    const nextType = getDatabaseType(profile.type);
    setSelectedTypeId(nextType.id);
    setForm(createFormFromProfile(profile));
    setActiveTab("main");
    setTestStatus(null);
  }

  async function handleTestProfile(profile) {
    const nextType = getDatabaseType(profile.type);
    const nextForm = createFormFromProfile(profile);
    setSelectedTypeId(nextType.id);
    setForm(nextForm);
    setActiveTab("main");
    await runConnectionTest(nextForm, nextType);
  }

  async function handleDeleteProfile(profileId) {
    const profile = savedConnections.find((item) => item.id === profileId);
    if (!profile) return;
    try { await deleteServerConnection(profile); setSavedConnections((current) => current.filter((item) => item.id !== profileId)); setSchemaExplorer((current) => current?.connectionId === profileId ? null : current); setNotice({ title: "ลบ connection profile แล้ว", message: "Profile ถูกปิดใช้งานบน Backend" }); }
    catch (error) { setNotice({ title: "ลบ profile ไม่สำเร็จ", message: error.message }); }
  }

  async function handleBrowseSchema(profile) {
    setSchemaLoadingId(profile.id);
    try {
      const schemas = await discoverConnectionSchema(profile.id);
      setSchemaExplorer({ connectionId: profile.id, connectionName: profile.name, schemas: Array.isArray(schemas) ? schemas : [] });
      setNotice(null);
    } catch (error) {
      setNotice({ title: "ไม่สามารถอ่าน schema ได้", message: error.message });
    } finally {
      setSchemaLoadingId("");
    }
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
    const errors = validation.errors;

    return (
      <div className="db-tab-panel">
        <div className="db-form-grid">
          <Field label="Host" error={errors.host} helper="เช่น db.company.internal">
              <input value={form.host} onChange={(event) => patchForm({ host: event.target.value })} />
            </Field>
            <Field label="Port" error={errors.port}>
              <input inputMode="numeric" value={form.port} onChange={(event) => patchForm({ port: event.target.value })} />
            </Field>
            <Field label="Database" error={errors.database}>
              <input value={form.database} onChange={(event) => patchForm({ database: event.target.value })} />
            </Field>
        </div>

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
    if (activeTab === "preview") return renderPreviewTab();
    return renderMainTab();
  }

  return (
    <PageContainer className="database-connection-page">
      <PageHeader
        kicker="Database Connection"
        title="เชื่อมต่อฐานข้อมูล"
        subtitle="บันทึก PostgreSQL connection แล้วอ่าน schema และตารางจริงผ่าน Backend"
        className="db-page-header"
        actions={(
          <div className="db-header-actions">
            <button type="button" onClick={() => navigate("/datasets")}>กลับไปชุดข้อมูล</button>
            <button type="button" className="is-primary" onClick={handleSaveProfile}>บันทึกโปรไฟล์</button>
            <button type="button" onClick={() => runConnectionTest()}>ทดสอบการเชื่อมต่อ</button>
          </div>
        )}
      >
        <div className="db-header-strip"><span>Database Connection Studio</span><span>{selectedType.name}</span><span>Backend-managed credentials</span></div>
      </PageHeader>

      <div className="db-connection-layout">
        <aside className="db-type-panel">
          <div className="db-panel-head">
            <span>ประเภทฐานข้อมูล</span>
            <strong>{DATABASE_TYPE_OPTIONS.length} connector</strong>
          </div>
          <div className="db-type-list">
            {DATABASE_TYPE_OPTIONS.map((type) => (
              <button key={type.id} type="button" className={`db-type-card${type.id === selectedTypeId ? " is-active" : ""}`} onClick={() => handleTypeChange(type.id)}>
                <span className="db-type-icon" aria-hidden="true">{type.icon}</span>
                <span className="db-type-copy"><strong>{type.name}</strong><small>{type.description}</small></span>
              </button>
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
                      <button type="button" onClick={() => handleTestProfile(profile)}>Test</button>
                      <button type="button" onClick={() => handleBrowseSchema(profile)} disabled={schemaLoadingId === profile.id}>{schemaLoadingId === profile.id ? "Loading…" : "Browse tables"}</button>
                      <button type="button" onClick={() => handleDeleteProfile(profile.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="db-empty-state">ยังไม่มี connection profile</div>
            )}
          </section>
          {schemaExplorer ? (
            <section className="db-schema-explorer" aria-label="PostgreSQL schema explorer">
              <header>
                <div><span>Database schema</span><h3>{schemaExplorer.connectionName}</h3></div>
                <strong>{schemaExplorer.schemas.reduce((count, schema) => count + schema.tables.length, 0)} tables</strong>
              </header>
              {schemaExplorer.schemas.length ? schemaExplorer.schemas.map((schema) => (
                <section className="db-schema-explorer__schema" key={schema.name}>
                  <h4>{schema.name}</h4>
                  <div className="db-schema-explorer__tables">
                    {schema.tables.map((table) => (
                      <details key={table.name}>
                        <summary>{table.name} <small>{table.columns.length} columns</small></summary>
                        <ul>{table.columns.map((column) => <li key={column.name}><strong>{column.name}</strong><span>{column.dataType}{column.nullable ? " · nullable" : ""}</span></li>)}</ul>
                      </details>
                    ))}
                  </div>
                </section>
              )) : <div className="db-empty-state">No accessible tables.</div>}
            </section>
          ) : null}
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
            </section>
          ) : (
            <section className="db-demo-note">
              <strong>PostgreSQL connection</strong>
              <span>บันทึกหรือเลือก connection profile แล้วทดสอบและเปิดดู schema/table ผ่าน Backend</span>
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
            <span>{testStatus?.message ?? "ยังไม่ได้ทดสอบ connection profile"}</span>
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
              <small>ผลลัพธ์นี้มาจากการทดสอบ PostgreSQL ผ่าน Backend</small>
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
