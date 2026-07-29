export const DATABASE_TYPE_OPTIONS = [
  {
    id: "postgresql",
    name: "PostgreSQL",
    icon: "PG",
    description: "เชื่อมต่อฐานข้อมูล PostgreSQL จริงเพื่อเลือก schema และตารางสำหรับงาน BI",
    mode: "host",
    defaults: {
      host: "",
      port: "5432",
      database: "",
      username: "",
      driverName: "PostgreSQL",
      driverVersion: "Server-managed",
      className: "pg",
    },
  },
];

export const CONNECTION_TABS = [
  { id: "main", label: "Main" },
  { id: "advanced", label: "Advanced" },
  { id: "ssl", label: "SSL" },
  { id: "ssh", label: "SSH" },
  { id: "preview", label: "Preview" },
];

export function getDatabaseType(typeId) {
  return DATABASE_TYPE_OPTIONS.find((type) => type.id === typeId) ?? DATABASE_TYPE_OPTIONS[0];
}

export function createDefaultConnectionForm(typeId = "postgresql") {
  const type = getDatabaseType(typeId);
  const defaults = type.defaults;
  return {
    type: type.id,
    connectionMode: "host",
    host: defaults.host,
    port: defaults.port,
    database: defaults.database,
    authType: "username-password",
    username: defaults.username,
    password: "",
    savePassword: true,
    connectionName: "PostgreSQL connection",
    workspace: "พื้นที่ทำงาน 01",
    tags: "analytics",
    advanced: {
      connectionTimeout: "30",
      readTimeout: "120",
      fetchSize: "1000",
      schema: "",
      defaultRole: "",
      applicationName: "Mini BI",
      timezone: "Asia/Bangkok",
      keepAlive: true,
      autoReconnect: true,
      readOnly: true,
      useCompression: false,
    },
    ssl: { enabled: false, mode: "prefer", caCertificate: "", clientCertificate: "", clientKey: "" },
    ssh: { enabled: false, host: "", port: "22", user: "", authMethod: "password", password: "", privateKey: "", localPort: "15432", remoteHost: "", remotePort: "5432" },
  };
}

export function buildConnectionUrl(form) {
  const host = form.host || "-";
  const port = form.port ? `:${form.port}` : "";
  const database = form.database ? `/${form.database}` : "";
  return `postgresql://${host}${port}${database}`;
}
