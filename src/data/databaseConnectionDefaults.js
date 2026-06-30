export const DATABASE_TYPE_OPTIONS = [
  {
    id: "postgresql",
    name: "PostgreSQL",
    icon: "PG",
    description: "ฐานข้อมูล relational ยอดนิยม เหมาะกับงาน BI และ analytics",
    status: "Demo",
    mode: "host",
    defaults: {
      host: "localhost",
      port: "5432",
      database: "postgres",
      username: "postgres",
      driverName: "PostgreSQL JDBC Driver",
      driverVersion: "42.7.4",
      className: "org.postgresql.Driver",
    },
  },
  {
    id: "mysql",
    name: "MySQL",
    icon: "MY",
    description: "เหมาะสำหรับ web application และระบบปฏิบัติการธุรกิจ",
    status: "Demo",
    mode: "host",
    defaults: {
      host: "localhost",
      port: "3306",
      database: "mini_bi",
      username: "root",
      driverName: "MySQL Connector/J",
      driverVersion: "9.1.0",
      className: "com.mysql.cj.jdbc.Driver",
    },
  },
  {
    id: "mariadb",
    name: "MariaDB",
    icon: "MA",
    description: "ฐานข้อมูล open-source ที่เข้ากันได้ดีกับ MySQL workload",
    status: "Demo",
    mode: "host",
    defaults: {
      host: "localhost",
      port: "3306",
      database: "mini_bi",
      username: "root",
      driverName: "MariaDB Java Client",
      driverVersion: "3.5.1",
      className: "org.mariadb.jdbc.Driver",
    },
  },
  {
    id: "sqlserver",
    name: "SQL Server",
    icon: "MS",
    description: "เชื่อมต่อ warehouse และระบบ enterprise ของ Microsoft",
    status: "Demo",
    mode: "host",
    defaults: {
      host: "localhost",
      port: "1433",
      database: "master",
      username: "sa",
      driverName: "Microsoft JDBC Driver for SQL Server",
      driverVersion: "12.8.1",
      className: "com.microsoft.sqlserver.jdbc.SQLServerDriver",
    },
  },
  {
    id: "sqlite",
    name: "SQLite",
    icon: "SL",
    description: "ไฟล์ฐานข้อมูลในเครื่องสำหรับ prototype และข้อมูลขนาดเล็ก",
    status: "Demo",
    mode: "file",
    defaults: {
      filePath: "C:/data/mini-bi.db",
      database: "mini-bi.db",
      driverName: "SQLite JDBC Driver",
      driverVersion: "3.47.1",
      className: "org.sqlite.JDBC",
    },
  },
  {
    id: "oracle",
    name: "Oracle",
    icon: "OR",
    description: "ฐานข้อมูล enterprise สำหรับระบบธุรกิจขนาดใหญ่",
    status: "Future",
    mode: "host",
    defaults: {
      host: "localhost",
      port: "1521",
      database: "ORCL",
      username: "system",
      driverName: "Oracle JDBC Driver",
      driverVersion: "23.6",
      className: "oracle.jdbc.OracleDriver",
    },
  },
  {
    id: "mongodb",
    name: "MongoDB",
    icon: "MO",
    description: "ฐานข้อมูล document สำหรับข้อมูลกึ่งโครงสร้าง",
    status: "Demo",
    mode: "connectionString",
    defaults: {
      url: "mongodb://localhost:27017/mini_bi",
      database: "mini_bi",
      username: "",
      driverName: "MongoDB Java Driver",
      driverVersion: "5.2.1",
      className: "com.mongodb.client.MongoClient",
    },
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    icon: "GS",
    description: "เชื่อมต่อข้อมูลจาก spreadsheet สำหรับทีมธุรกิจ",
    status: "Demo",
    mode: "sheet",
    defaults: {
      sheetUrl: "",
      database: "Google Sheet",
      username: "",
      driverName: "Google Sheets Connector",
      driverVersion: "Demo",
      className: "mini.bi.connectors.GoogleSheets",
    },
  },
  {
    id: "csv-excel",
    name: "CSV / Excel",
    icon: "XL",
    description: "ใช้ไฟล์ CSV หรือ Excel เป็นแหล่งข้อมูลแบบ local demo",
    status: "Demo",
    mode: "upload",
    defaults: {
      filePath: "",
      database: "Local File",
      username: "",
      driverName: "Mini BI File Connector",
      driverVersion: "Demo",
      className: "mini.bi.connectors.FileDataset",
    },
  },
];

export const CONNECTION_TABS = [
  { id: "main", label: "Main" },
  { id: "advanced", label: "Advanced" },
  { id: "ssl", label: "SSL" },
  { id: "ssh", label: "SSH" },
  { id: "driver", label: "Driver" },
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
    connectionMode: type.mode === "connectionString" ? "url" : "host",
    host: defaults.host ?? "",
    port: defaults.port ?? "",
    database: defaults.database ?? "",
    filePath: defaults.filePath ?? "",
    sheetUrl: defaults.sheetUrl ?? "",
    url: defaults.url ?? "",
    showAllDatabases: false,
    authType: "username-password",
    username: defaults.username ?? "",
    password: "",
    savePassword: false,
    connectionName: `${type.name} Connection`,
    workspace: "พื้นที่ทำงาน 01",
    tags: "demo, analytics",
    advanced: {
      connectionTimeout: "30",
      readTimeout: "120",
      fetchSize: "1000",
      schema: "public",
      defaultRole: "",
      applicationName: "Mini BI",
      timezone: "Asia/Bangkok",
      keepAlive: true,
      autoReconnect: true,
      readOnly: false,
      useCompression: false,
    },
    ssl: {
      enabled: false,
      mode: "prefer",
      caCertificate: "",
      clientCertificate: "",
      clientKey: "",
    },
    ssh: {
      enabled: false,
      host: "",
      port: "22",
      user: "",
      authMethod: "password",
      password: "",
      privateKey: "",
      localPort: "15432",
      remoteHost: defaults.host ?? "localhost",
      remotePort: defaults.port ?? "",
    },
  };
}

export function buildConnectionUrl(form, type = getDatabaseType(form.type)) {
  if (form.connectionMode === "url" && form.url) return form.url;
  if (type.mode === "connectionString" && form.url) return form.url;
  if (type.id === "sqlite") return `jdbc:sqlite:${form.filePath || "เลือกไฟล์ฐานข้อมูล"}`;
  if (type.id === "google-sheets") return form.sheetUrl || "ยังไม่ได้ระบุ Google Sheet URL";
  if (type.id === "csv-excel") return form.filePath || "ยังไม่ได้เลือกไฟล์";

  const host = form.host || "localhost";
  const port = form.port ? `:${form.port}` : "";
  const database = form.database ? `/${form.database}` : "";

  if (type.id === "mysql") return `jdbc:mysql://${host}${port}${database}`;
  if (type.id === "mariadb") return `jdbc:mariadb://${host}${port}${database}`;
  if (type.id === "sqlserver") return `jdbc:sqlserver://${host}${port};databaseName=${form.database || ""}`;
  if (type.id === "oracle") return `jdbc:oracle:thin:@${host}${port}/${form.database || ""}`;
  return `jdbc:postgresql://${host}${port}${database}`;
}
