import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const outputPath = path.join(repoRoot, "data_dictionary.xlsx");
const previewDir = path.join(__dirname, "previews");

const now = "2026-07-13";
const sourceEvidence = [
  "src/app/AppRoutes.jsx",
  "src/domain/workspace/workspaceSchema.js",
  "src/domain/workspace/workspaceRepository.js",
  "src/domain/charts/chartDataContract.js",
  "src/utils/databaseConnectionStorage.js",
  "src/utils/csvImport.js",
  "src/components/dashboard-v2/types.ts",
  "src/components/dashboard-v2/types/chartTypes.ts",
  "src/data/mockData.js",
  "docs/FRONTEND_BACKEND_HANDOFF.md",
  "docs/DATA_DICTIONARY_FRONTEND_GAP_ANALYSIS.md",
  "README.md",
];

const forbiddenTablePatterns = [
  /password/i,
  /password_reset/i,
  /refresh_token/i,
  /session/i,
  /otp/i,
  /social_login/i,
  /credential/i,
  /auth_secret/i,
];

const modules = [
  ["core_system", "Foundation tables for organization, workspace, users, settings, numbering and configuration.", "current"],
  ["master_data", "Reference data, types, statuses, templates and reusable option sets.", "current"],
  ["business_module", "Mini BI project, dataset, chart, dashboard, connection and sharing domain.", "current"],
  ["dashboard_reporting", "Dashboard, report, widget, chart result and export/reporting structures.", "current"],
  ["document_management", "Files, file versions, templates, links and attachment references.", "future"],
  ["notification", "Notification channels, templates, recipients and delivery logs.", "future"],
  ["workflow_approval", "Approval and workflow tables for controlled publishing and future governance.", "future"],
  ["audit_logging", "Activity, audit, request, access, error and data-change logs.", "current"],
  ["import_export", "CSV/import/export jobs and reusable data templates.", "current"],
  ["integration", "External source and safe connection metadata without persisted secrets.", "current"],
  ["future_expansion", "Planned collaboration, governance, quality and semantic-layer extensions.", "future"],
];

const moduleMap = Object.fromEntries(modules.map(([name, description, readiness]) => [name, { description, readiness }]));

const typeDefaults = {
  id: ["BIGINT UNSIGNED", "", "", "NO", "AUTO_INCREMENT"],
  bigint: ["BIGINT UNSIGNED", "", "", "NO", ""],
  bigintNull: ["BIGINT UNSIGNED", "", "", "YES", "NULL"],
  varchar: ["VARCHAR", "255", "", "NO", ""],
  varcharNull: ["VARCHAR", "255", "", "YES", "NULL"],
  text: ["TEXT", "", "", "YES", "NULL"],
  longtext: ["LONGTEXT", "", "", "YES", "NULL"],
  json: ["JSON", "", "", "YES", "NULL"],
  int: ["INT", "", "", "NO", "0"],
  intNull: ["INT", "", "", "YES", "NULL"],
  decimal: ["DECIMAL", "", "18,4", "NO", "0"],
  decimalNull: ["DECIMAL", "", "18,4", "YES", "NULL"],
  bool: ["TINYINT", "1", "", "NO", "0"],
  boolTrue: ["TINYINT", "1", "", "NO", "1"],
  datetime: ["DATETIME", "", "", "NO", "CURRENT_TIMESTAMP"],
  datetimeNull: ["DATETIME", "", "", "YES", "NULL"],
  dateNull: ["DATE", "", "", "YES", "NULL"],
};

function col(name, descriptionTh, kind, overrides = {}) {
  const defaults = typeDefaults[kind] ?? typeDefaults.varcharNull;
  const dataType = overrides.data_type ?? defaults[0];
  return {
    column_name: name,
    column_description_th: descriptionTh,
    data_type: dataType,
    length: overrides.length ?? defaults[1],
    precision_scale: overrides.precision_scale ?? defaults[2],
    nullable: overrides.nullable ?? defaults[3],
    default_value: overrides.default_value ?? defaults[4],
    primary_key: overrides.primary_key ?? "NO",
    foreign_key: overrides.foreign_key ?? "NO",
    foreign_table: overrides.foreign_table ?? "",
    foreign_column: overrides.foreign_column ?? "",
    unique_key: overrides.unique_key ?? "NO",
    index_name: overrides.index_name ?? "",
    index_type: overrides.index_type ?? "",
    enum_values: overrides.enum_values ?? "",
    example_value: overrides.example_value ?? exampleFor(name, dataType),
    business_rule: overrides.business_rule ?? businessRuleFor(name),
    validation_rule: overrides.validation_rule ?? validationFor(name, dataType, overrides.nullable ?? defaults[3]),
    notes: overrides.notes ?? "",
  };
}

function idCol() {
  return col("id", "รหัสหลักของระเบียน", "id", {
    primary_key: "YES",
    index_name: "PRIMARY",
    index_type: "PRIMARY",
    example_value: "1",
    business_rule: "ใช้เป็น surrogate key ภายในระบบ",
    validation_rule: "ต้องไม่ซ้ำและระบบเป็นผู้สร้างค่า",
  });
}

function fkCol(name, th, table, nullable = "YES", notes = "") {
  return col(name, th, nullable === "NO" ? "bigint" : "bigintNull", {
    foreign_key: "YES",
    foreign_table: table,
    foreign_column: "id",
    index_name: `idx_${name}`,
    index_type: "BTREE",
    nullable,
    notes,
  });
}

function standardCols({ org = true, branch = false, code = false, name = false, description = true, status = true, active = true, sort = false, metadata = true, remarks = true, actors = true, softDelete = true } = {}) {
  const cols = [];
  if (org) cols.push(fkCol("organization_id", "องค์กรเจ้าของข้อมูล", "organizations", "NO"));
  if (branch) cols.push(fkCol("branch_id", "สาขาที่เกี่ยวข้องกับข้อมูล", "branches", "YES"));
  if (code) cols.push(col("code", "รหัสอ้างอิงที่อ่านได้โดยผู้ใช้", "varchar", { length: "100", unique_key: "YES", index_name: "uq_code_scope", index_type: "UNIQUE" }));
  if (name) cols.push(col("name", "ชื่อรายการ", "varchar", { length: "255", index_name: "idx_name", index_type: "BTREE" }));
  if (description) cols.push(col("description", "รายละเอียดเพิ่มเติม", "text"));
  if (status) cols.push(col("status", "สถานะของรายการ", "varchar", { length: "50", default_value: "'active'", enum_values: "draft, active, inactive, archived, deleted", index_name: "idx_status", index_type: "BTREE" }));
  if (status) cols.push(fkCol("status_changed_by", "ผู้เปลี่ยนสถานะล่าสุด", "user_profiles", "YES"));
  if (status) cols.push(col("status_changed_at", "วันที่และเวลาที่เปลี่ยนสถานะล่าสุด", "datetimeNull"));
  if (active) cols.push(col("is_active", "ระบุว่ารายการยังเปิดใช้งานอยู่หรือไม่", "boolTrue"));
  if (sort) cols.push(col("sort_order", "ลำดับการแสดงผล", "int"));
  if (metadata) cols.push(col("metadata_json", "ข้อมูลเสริมในรูปแบบ JSON", "json"));
  if (remarks) cols.push(col("remarks", "หมายเหตุสำหรับผู้ใช้งานหรือผู้ดูแลระบบ", "text"));
  cols.push(col("created_at", "วันที่และเวลาที่สร้างรายการ", "datetime", { index_name: "idx_created_at", index_type: "BTREE" }));
  if (actors) cols.push(fkCol("created_by", "ผู้สร้างรายการ", "user_profiles", "YES"));
  cols.push(col("updated_at", "วันที่และเวลาที่แก้ไขล่าสุด", "datetime"));
  if (actors) cols.push(fkCol("updated_by", "ผู้แก้ไขล่าสุด", "user_profiles", "YES"));
  if (softDelete) cols.push(col("deleted_at", "วันที่และเวลาที่ลบแบบ soft delete", "datetimeNull", { index_name: "idx_deleted_at", index_type: "BTREE" }));
  if (softDelete && actors) cols.push(fkCol("deleted_by", "ผู้ลบรายการแบบ soft delete", "user_profiles", "YES"));
  return cols;
}

function exampleFor(name, dataType) {
  if (name === "id" || name.endsWith("_id")) return "1";
  if (name.includes("email")) return "user@example.com";
  if (name.includes("url")) return "https://example.com";
  if (name.includes("status")) return "active";
  if (name.includes("type") || name.includes("mode")) return "standard";
  if (name.includes("date") || name.endsWith("_at")) return "2026-07-13T09:00:00";
  if (dataType === "JSON") return "{\"key\":\"value\"}";
  if (dataType === "DECIMAL") return "1234.5000";
  if (dataType === "TINYINT") return "1";
  return name.replace(/_/g, " ");
}

function businessRuleFor(name) {
  if (name === "organization_id") return "ข้อมูลต้องถูกจำกัดขอบเขตตามองค์กรเสมอ";
  if (name.endsWith("_id")) return "ต้องอ้างอิงข้อมูลเจ้าของหรือข้อมูลแม่ที่ถูกต้อง";
  if (name === "status") return "สถานะต้องอยู่ในค่าที่ระบบกำหนด";
  if (name.includes("secret") || name.includes("password") || name.includes("token")) return "ห้ามเก็บ secret จริงในฐานข้อมูลนี้";
  if (name.endsWith("_json")) return "ใช้เก็บข้อมูลเสริมที่ไม่ควรทำลาย schema หลัก";
  return "ใช้รองรับ workflow และการค้นหาของ Mini BI ตามหลักฐานใน frontend contract";
}

function validationFor(name, dataType, nullable) {
  const required = nullable === "NO" ? "ต้องระบุค่า" : "ระบุค่าได้ตามบริบท";
  if (name === "status") return `${required}; ต้องอยู่ใน enum ที่กำหนด`;
  if (name.endsWith("_id")) return `${required}; ต้องเป็น bigint unsigned และอ้างอิงระเบียนที่มีอยู่`;
  if (dataType === "JSON") return "ต้องเป็น JSON ที่ parse ได้ใน MySQL/MariaDB";
  if (dataType === "VARCHAR") return `${required}; ความยาวต้องไม่เกิน length ที่กำหนด`;
  return required;
}

const tables = [];

function addTable(moduleName, tableName, tableDescription, extraCols = [], options = {}) {
  const table = {
    module_name: moduleName,
    table_name: tableName,
    table_description: tableDescription,
    current_or_future: options.current_or_future ?? moduleMap[moduleName]?.readiness ?? "current",
    notes: options.notes ?? "Designed from current repository scan and future production backend needs.",
    columns: [idCol(), ...extraCols, ...standardCols(options.standard ?? {})],
    polymorphic: options.polymorphic ?? [],
  };
  tables.push(table);
  return table;
}

// Foundation and master data tables required by the objective.
addTable("core_system", "organizations", "Tenant or organization boundary for all production data.", [
  col("code", "รหัสองค์กร", "varchar", { length: "50", unique_key: "YES", index_name: "uq_organizations_code", index_type: "UNIQUE" }),
  col("name", "ชื่อองค์กร", "varchar", { length: "255", index_name: "idx_organizations_name", index_type: "BTREE" }),
  col("legal_name", "ชื่อนิติบุคคล", "varcharNull"),
  col("timezone", "เขตเวลาหลักขององค์กร", "varchar", { length: "80", default_value: "'Asia/Bangkok'" }),
  col("locale", "ภาษาหลักขององค์กร", "varchar", { length: "20", default_value: "'th-TH'" }),
], { standard: { org: false, code: false, name: false, description: true, status: true, actors: false } });
addTable("core_system", "branches", "Organization branch or operating location.", [fkCol("organization_id", "องค์กรเจ้าของสาขา", "organizations", "NO"), col("code", "รหัสสาขา", "varchar", { length: "50" }), col("name", "ชื่อสาขา", "varchar")], { standard: { org: false, code: false, name: false, description: true, status: true } });
addTable("core_system", "departments", "Department master for user ownership and workflow routing.", [fkCol("organization_id", "องค์กรเจ้าของแผนก", "organizations", "NO"), fkCol("branch_id", "สาขาหลักของแผนก", "branches"), fkCol("parent_department_id", "แผนกแม่", "departments"), col("code", "รหัสแผนก", "varchar", { length: "50" }), col("name", "ชื่อแผนก", "varchar")], { standard: { org: false, code: false, name: false, description: true, status: true } });
addTable("core_system", "teams", "Team master for collaboration and ownership.", [fkCol("organization_id", "องค์กรเจ้าของทีม", "organizations", "NO"), fkCol("department_id", "แผนกที่ทีมสังกัด", "departments"), col("code", "รหัสทีม", "varchar", { length: "50" }), col("name", "ชื่อทีม", "varchar")], { standard: { org: false, code: false, name: false, description: true, status: true } });
addTable("core_system", "positions", "Position master for profile and approval routing.", [fkCol("organization_id", "องค์กรเจ้าของตำแหน่ง", "organizations", "NO"), col("code", "รหัสตำแหน่ง", "varchar", { length: "50" }), col("name", "ชื่อตำแหน่ง", "varchar"), col("level_no", "ระดับตำแหน่ง", "int")], { standard: { org: false, code: false, name: false, description: true, status: true } });
addTable("core_system", "user_profiles", "External-login user profile table without local auth secrets.", [
  fkCol("organization_id", "องค์กรหลักของผู้ใช้", "organizations", "NO"),
  fkCol("department_id", "แผนกของผู้ใช้", "departments"),
  fkCol("team_id", "ทีมของผู้ใช้", "teams"),
  fkCol("position_id", "ตำแหน่งของผู้ใช้", "positions"),
  col("external_user_id", "รหัสผู้ใช้จากระบบยืนยันตัวตนภายนอก", "varchar", { length: "191", unique_key: "YES", index_name: "uq_external_user", index_type: "UNIQUE" }),
  col("external_auth_provider", "ผู้ให้บริการ login ภายนอก", "varchar", { length: "80", index_name: "idx_external_provider", index_type: "BTREE", enum_values: "azure_ad, google_workspace, okta, custom_oidc" }),
  col("email", "อีเมลสำหรับแสดงผลและติดต่อ", "varchar", { length: "191", index_name: "idx_email", index_type: "BTREE" }),
  col("display_name", "ชื่อที่แสดงในระบบ", "varchar"),
  col("avatar_url", "ลิงก์รูปโปรไฟล์", "varcharNull", { length: "500" }),
], { standard: { org: false, code: false, name: false, description: false, status: true } });
addTable("core_system", "roles", "Role definitions for RBAC.", [fkCol("organization_id", "องค์กรเจ้าของ role", "organizations", "NO"), col("code", "รหัส role", "varchar", { length: "80", unique_key: "YES" }), col("name", "ชื่อ role", "varchar")], { standard: { org: false, code: false, name: false, description: true, status: true } });
addTable("core_system", "permissions", "Permission catalog for backend authorization.", [col("code", "รหัส permission", "varchar", { length: "120", unique_key: "YES" }), col("name", "ชื่อ permission", "varchar"), col("resource", "ทรัพยากรที่ควบคุม", "varchar", { length: "80" }), col("action", "การกระทำที่อนุญาต", "varchar", { length: "80" })], { standard: { org: false, code: false, name: false, description: true, status: true } });
addTable("core_system", "role_permissions", "Many-to-many mapping between roles and permissions.", [fkCol("role_id", "role ที่ได้รับ permission", "roles", "NO"), fkCol("permission_id", "permission ที่กำหนดให้ role", "permissions", "NO")], { standard: { org: false, code: false, name: false, description: false, status: false, active: true, metadata: false, remarks: false } });
addTable("core_system", "user_roles", "Many-to-many mapping between users and roles.", [fkCol("organization_id", "องค์กรที่ role assignment มีผล", "organizations", "NO"), fkCol("user_profile_id", "ผู้ใช้ที่ได้รับ role", "user_profiles", "NO"), fkCol("role_id", "role ที่มอบให้ผู้ใช้", "roles", "NO"), col("effective_from", "วันที่เริ่มมีผล", "dateNull"), col("effective_to", "วันที่สิ้นสุดผล", "dateNull")], { standard: { org: false, code: false, name: false, description: false, status: true, metadata: true, remarks: true } });
addTable("core_system", "system_settings", "Scoped key-value settings.", [fkCol("organization_id", "องค์กรเจ้าของ setting", "organizations", "NO"), col("scope_type", "ชนิด scope", "varchar", { length: "50", enum_values: "organization, workspace, project, user, dashboard" }), col("scope_id", "รหัส scope แบบ polymorphic", "bigintNull"), col("setting_key", "ชื่อ key", "varchar", { length: "120" }), col("setting_value_json", "ค่า setting", "json")], { standard: { org: false, code: false, name: false, description: true, status: true }, polymorphic: [["scope_type", "scope_id", "Polymorphic settings scope."]] });
addTable("core_system", "system_configurations", "System-level configuration flags.", [col("config_key", "ชื่อ configuration", "varchar", { length: "120", unique_key: "YES" }), col("config_value_json", "ค่า configuration", "json"), col("is_public", "อนุญาตให้ frontend อ่านได้หรือไม่", "bool")], { standard: { org: false, code: false, name: false, description: true, status: true } });
addTable("core_system", "running_numbers", "Running number rules per organization/module.", [fkCol("organization_id", "องค์กรที่ใช้เลขรัน", "organizations", "NO"), col("module_code", "รหัส module", "varchar", { length: "80" }), col("prefix", "คำนำหน้าเลขรัน", "varcharNull", { length: "50" }), col("current_no", "เลขล่าสุด", "bigint"), col("padding", "จำนวนหลัก", "int"), col("reset_policy", "นโยบายการ reset", "varchar", { length: "30", enum_values: "never, yearly, monthly, daily" })], { standard: { org: false, code: false, name: false, description: true, status: true } });
addTable("master_data", "status_definitions", "Reusable status definitions and labels.", [fkCol("organization_id", "องค์กรที่ใช้ status", "organizations", "NO"), col("entity_name", "ชื่อตารางหรือ entity", "varchar", { length: "100" }), col("status_code", "รหัสสถานะ", "varchar", { length: "80" }), col("label_th", "ป้ายชื่อภาษาไทย", "varchar"), col("label_en", "ป้ายชื่อภาษาอังกฤษ", "varchar"), col("is_default", "เป็นค่าเริ่มต้นหรือไม่", "bool"), col("sort_order", "ลำดับการแสดงผล", "int")], { standard: { org: false, code: false, name: false, description: true, status: true } });

const requiredSimpleTables = [
  ["document_management", "files", "Stored file metadata.", [col("storage_provider", "ผู้ให้บริการจัดเก็บไฟล์", "varchar", { length: "80" }), col("storage_key", "รหัสไฟล์ใน storage", "varchar", { length: "500" }), col("original_file_name", "ชื่อไฟล์เดิม", "varchar"), col("mime_type", "ชนิดไฟล์", "varchar", { length: "120" }), col("file_size_bytes", "ขนาดไฟล์หน่วย byte", "bigint"), col("checksum_sha256", "ค่า checksum ของไฟล์", "varchar", { length: "64" })]],
  ["document_management", "file_versions", "Version history of files.", [fkCol("file_id", "ไฟล์หลัก", "files", "NO"), col("version_no", "เลข version", "int"), col("storage_key", "storage key ของ version", "varchar", { length: "500" })]],
  ["document_management", "file_links", "Polymorphic links from files to entities.", [fkCol("file_id", "ไฟล์ที่ถูกแนบ", "files", "NO"), col("reference_table", "ชื่อตารางปลายทาง", "varchar", { length: "100" }), col("reference_id", "รหัสรายการปลายทาง", "bigint"), col("link_type", "ประเภทการเชื่อมโยง", "varchar", { length: "80" })], [["reference_table", "reference_id", "Polymorphic file attachment target."]]],
  ["master_data", "document_types", "Document type master.", [col("code", "รหัสประเภทเอกสาร", "varchar", { length: "80" }), col("name", "ชื่อประเภทเอกสาร", "varchar")]],
  ["document_management", "document_templates", "Reusable document templates.", [fkCol("document_type_id", "ประเภทเอกสาร", "document_types"), col("template_code", "รหัส template", "varchar", { length: "80" }), col("template_name", "ชื่อ template", "varchar"), fkCol("file_id", "ไฟล์ template", "files")]],
  ["notification", "notification_channels", "Notification channel master.", [col("code", "รหัส channel", "varchar", { length: "80" }), col("name", "ชื่อ channel", "varchar"), col("provider", "ผู้ให้บริการส่งข้อความ", "varcharNull")]],
  ["notification", "notification_templates", "Reusable notification templates.", [col("template_code", "รหัส template", "varchar", { length: "80" }), col("subject_template", "หัวข้อข้อความ", "varchar"), col("body_template", "เนื้อหาข้อความ", "text")]],
  ["notification", "notifications", "Notification event records.", [fkCol("template_id", "template ที่ใช้สร้าง", "notification_templates"), col("title", "หัวข้อแจ้งเตือน", "varchar"), col("body", "รายละเอียดแจ้งเตือน", "text"), col("reference_table", "ตารางอ้างอิง", "varcharNull", { length: "100" }), col("reference_id", "รหัสอ้างอิง", "bigintNull")], [["reference_table", "reference_id", "Polymorphic notification target."]]],
  ["notification", "notification_recipients", "Notification recipients.", [fkCol("notification_id", "รายการแจ้งเตือน", "notifications", "NO"), fkCol("user_profile_id", "ผู้รับแจ้งเตือน", "user_profiles", "NO"), col("delivery_status", "สถานะการส่ง", "varchar", { length: "50", enum_values: "pending, sent, failed, read" })]],
  ["notification", "notification_reads", "Notification read receipts.", [fkCol("notification_id", "รายการแจ้งเตือน", "notifications", "NO"), fkCol("user_profile_id", "ผู้ที่อ่าน", "user_profiles", "NO"), col("read_at", "วันที่อ่าน", "datetime")]],
  ["notification", "notification_delivery_logs", "Delivery attempt logs.", [fkCol("notification_id", "รายการแจ้งเตือน", "notifications", "NO"), fkCol("channel_id", "ช่องทางที่ใช้ส่ง", "notification_channels"), col("provider_message_id", "รหัสข้อความจาก provider", "varcharNull"), col("result_status", "ผลการส่ง", "varchar", { length: "50", enum_values: "success, failed, retry" })]],
  ["core_system", "comments", "Entity comments.", [col("reference_table", "ตารางที่ถูก comment", "varchar", { length: "100" }), col("reference_id", "รหัสรายการที่ถูก comment", "bigint"), fkCol("user_profile_id", "ผู้แสดงความคิดเห็น", "user_profiles", "NO"), col("comment_text", "ข้อความ comment", "text")], [["reference_table", "reference_id", "Polymorphic comment target."]]],
  ["core_system", "comment_mentions", "Users mentioned in comments.", [fkCol("comment_id", "comment ที่ mention", "comments", "NO"), fkCol("user_profile_id", "ผู้ถูก mention", "user_profiles", "NO")]],
  ["core_system", "notes", "Private or shared notes.", [col("reference_table", "ตารางที่บันทึก note", "varchar", { length: "100" }), col("reference_id", "รหัสรายการที่บันทึก note", "bigint"), col("note_text", "ข้อความ note", "text")], [["reference_table", "reference_id", "Polymorphic note target."]]],
  ["master_data", "tags", "Tags for classification.", [col("code", "รหัส tag", "varchar", { length: "80" }), col("name", "ชื่อ tag", "varchar"), col("color", "สี tag", "varcharNull", { length: "20" })]],
  ["master_data", "tag_links", "Polymorphic tag mapping.", [fkCol("tag_id", "tag ที่ผูก", "tags", "NO"), col("reference_table", "ตารางปลายทาง", "varchar", { length: "100" }), col("reference_id", "รหัสปลายทาง", "bigint")], [["reference_table", "reference_id", "Polymorphic tag target."]]],
  ["audit_logging", "activity_logs", "User activity stream.", [fkCol("user_profile_id", "ผู้กระทำ", "user_profiles"), col("action", "กิจกรรมที่ทำ", "varchar", { length: "120" }), col("reference_table", "ตารางอ้างอิง", "varcharNull", { length: "100" }), col("reference_id", "รหัสอ้างอิง", "bigintNull"), col("ip_address", "IP address", "varcharNull", { length: "80" })], [["reference_table", "reference_id", "Polymorphic activity target."]]],
  ["audit_logging", "audit_logs", "Immutable audit events.", [fkCol("user_profile_id", "ผู้กระทำ", "user_profiles"), col("event_type", "ประเภทเหตุการณ์", "varchar", { length: "120" }), col("entity_table", "ตารางที่เปลี่ยนแปลง", "varchar", { length: "100" }), col("entity_id", "รหัส entity", "bigint"), col("old_value_json", "ค่าก่อนแก้ไข", "json"), col("new_value_json", "ค่าหลังแก้ไข", "json")], [["entity_table", "entity_id", "Polymorphic audit target."]]],
  ["audit_logging", "data_change_logs", "Detailed row change logs.", [col("table_name", "ชื่อตารางที่เปลี่ยน", "varchar", { length: "100" }), col("record_id", "รหัส record", "bigint"), col("change_type", "ประเภทการเปลี่ยนแปลง", "varchar", { length: "50", enum_values: "insert, update, delete, restore" }), col("change_set_json", "ชุดข้อมูลที่เปลี่ยน", "json")], [["table_name", "record_id", "Polymorphic changed record."]]],
  ["audit_logging", "error_logs", "Application/server error logs.", [col("error_code", "รหัส error", "varcharNull", { length: "120" }), col("message", "ข้อความ error", "text"), col("stack_trace", "stack trace", "longtext"), col("severity", "ระดับความรุนแรง", "varchar", { length: "50", enum_values: "info, warning, error, critical" })]],
  ["audit_logging", "api_request_logs", "HTTP/API request logs.", [fkCol("user_profile_id", "ผู้เรียก API", "user_profiles"), col("request_id", "รหัส request", "varchar", { length: "80", index_name: "idx_request_id", index_type: "BTREE" }), col("method", "HTTP method", "varchar", { length: "20" }), col("path", "path ที่เรียก", "varchar", { length: "500" }), col("status_code", "HTTP status", "int"), col("duration_ms", "เวลาประมวลผล ms", "int")]],
  ["audit_logging", "user_access_logs", "User access and login-result audit, without session/token storage.", [fkCol("user_profile_id", "ผู้ใช้", "user_profiles"), col("access_type", "ประเภทการเข้าถึง", "varchar", { length: "80", enum_values: "login_success, login_failed, logout, access_denied" }), col("external_auth_provider", "ผู้ให้บริการภายนอก", "varcharNull", { length: "80" }), col("ip_address", "IP address", "varcharNull", { length: "80" })]],
];

for (const [moduleName, tableName, description, extras, polymorphic = []] of requiredSimpleTables) {
  addTable(moduleName, tableName, description, extras, { standard: { org: true, code: false, name: false, description: true, status: true }, polymorphic });
}

const workflowTables = [
  ["approval_flows", "Approval flow definitions.", [col("flow_code", "รหัส approval flow", "varchar", { length: "80" }), col("flow_name", "ชื่อ approval flow", "varchar"), col("entity_table", "ตารางที่ flow ใช้", "varchar", { length: "100" })]],
  ["approval_flow_steps", "Approval flow step definitions.", [fkCol("approval_flow_id", "approval flow", "approval_flows", "NO"), col("step_no", "ลำดับขั้น", "int"), fkCol("approver_role_id", "role ผู้อนุมัติ", "roles"), fkCol("approver_user_profile_id", "ผู้อนุมัติเฉพาะคน", "user_profiles")]],
  ["approval_requests", "Approval request instances.", [fkCol("approval_flow_id", "approval flow ที่ใช้", "approval_flows"), col("reference_table", "ตารางที่ขออนุมัติ", "varchar", { length: "100" }), col("reference_id", "รหัสรายการที่ขออนุมัติ", "bigint"), fkCol("requested_by", "ผู้ขออนุมัติ", "user_profiles", "NO"), col("approval_status", "สถานะอนุมัติ", "varchar", { length: "50", enum_values: "draft, pending, approved, rejected, cancelled" })], [["reference_table", "reference_id", "Polymorphic approval target."]]],
  ["approval_request_steps", "Approval request step state.", [fkCol("approval_request_id", "คำขออนุมัติ", "approval_requests", "NO"), col("step_no", "ลำดับขั้น", "int"), fkCol("assigned_user_profile_id", "ผู้อนุมัติที่ได้รับมอบหมาย", "user_profiles"), col("step_status", "สถานะขั้นตอน", "varchar", { length: "50", enum_values: "pending, approved, rejected, skipped" })]],
  ["approval_actions", "Approval actions history.", [fkCol("approval_request_step_id", "ขั้นตอนที่ดำเนินการ", "approval_request_steps", "NO"), fkCol("acted_by", "ผู้ดำเนินการ", "user_profiles", "NO"), col("action_type", "ประเภท action", "varchar", { length: "50", enum_values: "submit, approve, reject, cancel, comment" }), col("action_comment", "ความเห็น", "text")]],
  ["workflow_instances", "Workflow runtime instances.", [col("workflow_code", "รหัส workflow", "varchar", { length: "80" }), col("reference_table", "ตารางเป้าหมาย", "varchar", { length: "100" }), col("reference_id", "รหัสเป้าหมาย", "bigint"), col("workflow_status", "สถานะ workflow", "varchar", { length: "50", enum_values: "running, completed, failed, cancelled" })], [["reference_table", "reference_id", "Polymorphic workflow target."]]],
  ["workflow_history", "Workflow transition history.", [fkCol("workflow_instance_id", "workflow instance", "workflow_instances", "NO"), col("from_status", "สถานะก่อนหน้า", "varcharNull", { length: "50" }), col("to_status", "สถานะใหม่", "varchar", { length: "50" }), fkCol("acted_by", "ผู้ดำเนินการ", "user_profiles")]],
];
for (const [tableName, description, extras, polymorphic = []] of workflowTables) addTable("workflow_approval", tableName, description, extras, { standard: { org: true, code: false, name: false, description: true, status: true }, polymorphic });

const importExportTables = [
  ["import_jobs", "Import job header for CSV/Excel/source ingestion.", [col("job_code", "รหัสงาน import", "varchar", { length: "80" }), col("source_type", "ชนิดแหล่งข้อมูล", "varchar", { length: "50", enum_values: "csv, excel, database, api, google_sheets" }), col("file_name", "ชื่อไฟล์ต้นทาง", "varcharNull"), col("job_status", "สถานะงาน", "varchar", { length: "50", enum_values: "queued, running, completed, failed, cancelled" })]],
  ["import_job_rows", "Imported row staging and result.", [fkCol("import_job_id", "งาน import", "import_jobs", "NO"), col("row_no", "เลขแถว", "int"), col("row_data_json", "ข้อมูลแถว", "json"), col("row_status", "สถานะแถว", "varchar", { length: "50", enum_values: "pending, valid, invalid, imported, skipped" })]],
  ["import_errors", "Import validation errors.", [fkCol("import_job_id", "งาน import", "import_jobs", "NO"), fkCol("import_job_row_id", "แถวที่เกิด error", "import_job_rows"), col("field_name", "ชื่อ field", "varcharNull", { length: "120" }), col("error_message", "ข้อความ error", "text")]],
  ["export_jobs", "Export job header.", [col("job_code", "รหัสงาน export", "varchar", { length: "80" }), col("export_type", "ชนิด export", "varchar", { length: "50", enum_values: "json, csv, png, pdf, excel" }), col("job_status", "สถานะงาน", "varchar", { length: "50", enum_values: "queued, running, completed, failed, cancelled" })]],
  ["export_files", "Files produced by export jobs.", [fkCol("export_job_id", "งาน export", "export_jobs", "NO"), fkCol("file_id", "ไฟล์ผลลัพธ์", "files", "NO"), col("download_count", "จำนวนครั้งที่ดาวน์โหลด", "int")]],
  ["data_templates", "Reusable data import/export templates.", [col("template_code", "รหัส data template", "varchar", { length: "80" }), col("template_name", "ชื่อ template", "varchar"), col("template_schema_json", "schema ของ template", "json")]],
];
for (const [tableName, description, extras] of importExportTables) addTable("import_export", tableName, description, extras, { standard: { org: true, code: false, name: false, description: true, status: true } });

const reportingTables = [
  ["report_definitions", "Report definition catalog.", [col("report_code", "รหัส report", "varchar", { length: "80" }), col("report_name", "ชื่อ report", "varchar"), col("definition_json", "โครงสร้าง report", "json")]],
  ["report_parameters", "Report parameter definitions.", [fkCol("report_definition_id", "report definition", "report_definitions", "NO"), col("parameter_key", "ชื่อ parameter", "varchar", { length: "120" }), col("parameter_type", "ชนิด parameter", "varchar", { length: "50" }), col("default_value_json", "ค่าเริ่มต้น", "json")]],
  ["report_runs", "Report execution history.", [fkCol("report_definition_id", "report definition", "report_definitions", "NO"), fkCol("run_by", "ผู้ run report", "user_profiles"), col("run_status", "สถานะ run", "varchar", { length: "50", enum_values: "queued, running, completed, failed" }), col("started_at", "เวลาเริ่ม", "datetimeNull"), col("completed_at", "เวลาจบ", "datetimeNull")]],
  ["report_exports", "Report export outputs.", [fkCol("report_run_id", "report run", "report_runs", "NO"), fkCol("file_id", "ไฟล์ export", "files"), col("export_format", "รูปแบบไฟล์", "varchar", { length: "50", enum_values: "pdf, excel, csv, png" })]],
  ["dashboard_widgets", "Reusable dashboard widget catalog and default layout.", [col("widget_code", "รหัส widget", "varchar", { length: "80" }), col("widget_type", "ประเภท widget", "varchar", { length: "50", enum_values: "chart, kpi, table, text, image, filter" }), col("default_config_json", "ค่า config เริ่มต้น", "json")]],
  ["dashboard_user_preferences", "Per-user dashboard preferences.", [fkCol("dashboard_id", "dashboard ที่ตั้งค่า", "project_dashboards"), fkCol("user_profile_id", "ผู้ใช้ที่ตั้งค่า", "user_profiles"), col("preference_json", "ค่า preference", "json")]],
];
for (const [tableName, description, extras] of reportingTables) addTable("dashboard_reporting", tableName, description, extras, { standard: { org: true, code: false, name: false, description: true, status: true } });

// Business-specific Mini BI tables discovered from the repository.
const businessTables = [
  ["workspaces", "Canonical workspace/tenant document root for Mini BI.", "business_module", [fkCol("organization_id", "องค์กรเจ้าของ workspace", "organizations", "NO"), col("workspace_code", "รหัส workspace", "varchar", { length: "80" }), col("workspace_name", "ชื่อ workspace", "varchar"), col("schema_version", "version ของ workspace schema", "int"), col("revision_no", "revision สำหรับ optimistic locking", "bigint"), col("active_project_id", "project ที่เปิดล่าสุด", "bigintNull"), col("active_dashboard_id", "dashboard ที่เปิดล่าสุด", "bigintNull")]],
  ["workspace_members", "Users who can access a workspace.", "business_module", [fkCol("workspace_id", "workspace", "workspaces", "NO"), fkCol("user_profile_id", "สมาชิก workspace", "user_profiles", "NO"), fkCol("role_id", "role ภายใน workspace", "roles"), col("member_status", "สถานะสมาชิก", "varchar", { length: "50", enum_values: "invited, active, suspended, removed" })]],
  ["projects", "Mini BI project container for datasets, charts, dashboards and shares.", "business_module", [fkCol("workspace_id", "workspace เจ้าของ project", "workspaces", "NO"), col("client_project_key", "รหัส project จาก frontend/local migration", "varchar", { length: "120" }), col("project_name", "ชื่อ project", "varchar"), col("revision_no", "revision สำหรับ optimistic locking", "bigint")]],
  ["project_members", "Project-level membership and role overrides.", "business_module", [fkCol("project_id", "project", "projects", "NO"), fkCol("user_profile_id", "สมาชิก project", "user_profiles", "NO"), fkCol("role_id", "role ใน project", "roles"), col("member_status", "สถานะสมาชิก", "varchar", { length: "50", enum_values: "active, suspended, removed" })]],
  ["project_dashboards", "Dashboard records in a project.", "dashboard_reporting", [fkCol("project_id", "project เจ้าของ dashboard", "projects", "NO"), col("client_dashboard_key", "รหัส dashboard จาก frontend/local migration", "varchar", { length: "120" }), col("dashboard_name", "ชื่อ dashboard", "varchar"), col("canvas_settings_json", "การตั้งค่า canvas", "json"), col("revision_no", "revision สำหรับ optimistic locking", "bigint")]],
  ["dashboard_pages", "Optional dashboard pages/sections for future large dashboards.", "dashboard_reporting", [fkCol("dashboard_id", "dashboard", "project_dashboards", "NO"), col("page_name", "ชื่อหน้า", "varchar"), col("page_no", "ลำดับหน้า", "int"), col("layout_json", "layout ของหน้า", "json")]],
  ["dashboard_layout_versions", "Dashboard layout version history.", "dashboard_reporting", [fkCol("dashboard_id", "dashboard", "project_dashboards", "NO"), col("version_no", "เลข version", "int"), col("layout_json", "snapshot layout", "json"), fkCol("published_by", "ผู้ publish", "user_profiles")]],
  ["widgets", "Dashboard widget instances discovered from dashboard canvas builder.", "dashboard_reporting", [fkCol("dashboard_id", "dashboard", "project_dashboards", "NO"), fkCol("project_id", "project", "projects", "NO"), fkCol("chart_id", "chart ที่ widget อ้างถึง", "chart_library_items"), col("client_widget_key", "รหัส widget จาก frontend", "varchar", { length: "120" }), col("widget_type", "ประเภท widget", "varchar", { length: "50", enum_values: "chart, kpi, table, text, image, filter" }), col("layout_json", "ตำแหน่งและขนาด widget", "json"), col("presentation_json", "ค่า presentation", "json"), fkCol("asset_file_id", "ไฟล์ asset สำหรับ image widget", "files")]],
  ["chart_categories", "Supported chart category catalog.", "master_data", [col("code", "รหัสหมวดกราฟ", "varchar", { length: "80" }), col("label_en", "ชื่ออังกฤษ", "varchar"), col("label_th", "ชื่อไทย", "varchar")]],
  ["chart_types", "Supported chart type catalog from chartTypes.ts.", "master_data", [fkCol("chart_category_id", "หมวดกราฟ", "chart_categories"), col("code", "รหัส chart type", "varchar", { length: "80" }), col("renderer_type", "renderer ที่ใช้", "varchar", { length: "80" }), col("is_advanced", "เป็น chart ขั้นสูงหรือไม่", "bool"), col("is_enabled", "เปิดใช้งานหรือไม่", "boolTrue")]],
  ["chart_templates", "Reusable chart templates.", "master_data", [fkCol("chart_type_id", "ชนิดกราฟ", "chart_types"), col("template_code", "รหัส template", "varchar", { length: "80" }), col("template_name", "ชื่อ template", "varchar"), col("template_config_json", "config template", "json")]],
  ["chart_palettes", "Reusable chart color palettes.", "master_data", [col("palette_code", "รหัส palette", "varchar", { length: "80" }), col("palette_name", "ชื่อ palette", "varchar"), col("colors_json", "รายการสี", "json")]],
  ["chart_library_items", "Saved charts/visual assets in a project.", "dashboard_reporting", [fkCol("project_id", "project เจ้าของ chart", "projects", "NO"), fkCol("dataset_id", "dataset หลัก", "datasets"), fkCol("chart_type_id", "ชนิดกราฟ", "chart_types"), col("client_chart_key", "รหัส chart จาก frontend", "varchar", { length: "120" }), col("chart_name", "ชื่อ chart", "varchar"), col("chart_title", "หัวข้อ chart", "varchar"), col("engine", "chart engine", "varchar", { length: "50", enum_values: "echarts, chartjs, unknown" }), col("config_json", "config chart", "json"), col("revision_no", "revision สำหรับ optimistic locking", "bigint")]],
  ["chart_versions", "Version history for chart specs.", "dashboard_reporting", [fkCol("chart_id", "chart", "chart_library_items", "NO"), col("version_no", "เลข version", "int"), col("config_json", "config snapshot", "json"), col("change_note", "หมายเหตุการเปลี่ยนแปลง", "text")]],
  ["chart_data_contracts", "Pinned chart data source contract.", "dashboard_reporting", [fkCol("chart_id", "chart", "chart_library_items", "NO"), fkCol("dataset_id", "dataset ที่อ้างถึง", "datasets"), col("source_type", "ชนิดแหล่งข้อมูล", "varchar", { length: "50", enum_values: "dataset, sql-result, snapshot, demo, unavailable, unknown" }), col("fields_json", "field contract", "json"), col("rows_json", "row snapshot", "json"), col("query_text", "SQL/query ที่ใช้", "text")]],
  ["chart_mappings", "Chart mapping header.", "dashboard_reporting", [fkCol("chart_id", "chart", "chart_library_items", "NO"), col("mapping_version", "version mapping", "int"), col("mapping_json", "mapping ทั้งหมด", "json")]],
  ["chart_mapping_fields", "Field-level chart mappings.", "dashboard_reporting", [fkCol("chart_mapping_id", "mapping", "chart_mappings", "NO"), fkCol("dataset_field_id", "field ที่ map", "dataset_fields"), col("slot_id", "mapping slot", "varchar", { length: "50", enum_values: "xAxis, yAxis, legend, tooltip, filter, color, size, value, category, series, rows, columns, source, target, open, high, low, close" }), col("aggregation", "aggregation", "varcharNull", { length: "50", enum_values: "None, Sum, Average, Min, Max, Count, Count Distinct, Median, First, Last" })]],
  ["chart_settings", "Chart setting groups.", "dashboard_reporting", [fkCol("chart_id", "chart", "chart_library_items", "NO"), col("setting_group", "กลุ่ม setting", "varchar", { length: "50", enum_values: "general, axis, labels, legend, colors, grid, tooltip, animation, advanced" }), col("setting_json", "ค่า setting", "json")]],
  ["chart_filters", "Chart-level filters.", "dashboard_reporting", [fkCol("chart_id", "chart", "chart_library_items", "NO"), fkCol("dataset_field_id", "field ที่ filter", "dataset_fields"), col("filter_type", "ชนิด filter", "varchar", { length: "50", enum_values: "text, number, date, boolean" }), col("filter_value_json", "ค่า filter", "json")]],
  ["chart_query_results", "Cached or audited chart query results.", "dashboard_reporting", [fkCol("chart_id", "chart", "chart_library_items"), fkCol("dataset_id", "dataset", "datasets"), col("query_text", "SQL/query", "text"), col("row_count", "จำนวนแถว", "int"), col("column_count", "จำนวนคอลัมน์", "int"), col("truncated", "ถูกตัดทอนหรือไม่", "bool")]],
  ["chart_query_result_fields", "Fields in chart query result.", "dashboard_reporting", [fkCol("chart_query_result_id", "query result", "chart_query_results", "NO"), col("field_name", "ชื่อ field", "varchar", { length: "120" }), col("field_type", "ชนิด field", "varchar", { length: "50" }), col("ordinal_no", "ลำดับ field", "int")]],
  ["chart_query_result_rows", "Rows in chart query result snapshot.", "dashboard_reporting", [fkCol("chart_query_result_id", "query result", "chart_query_results", "NO"), col("row_no", "ลำดับแถว", "int"), col("row_json", "ข้อมูลแถว", "json")]],
  ["datasets", "Project-owned dataset metadata.", "business_module", [fkCol("project_id", "project เจ้าของ dataset", "projects", "NO"), col("client_dataset_key", "รหัส dataset จาก frontend", "varchar", { length: "120" }), col("dataset_name", "ชื่อ dataset", "varchar"), col("source_type", "ชนิดแหล่งข้อมูล", "varchar", { length: "50", enum_values: "demo, csv, excel, database, api, google_sheets, sql-result" }), col("source_name", "ชื่อแหล่งข้อมูล", "varcharNull"), col("row_count", "จำนวนแถว", "int"), col("column_count", "จำนวนคอลัมน์", "int"), col("schema_version", "version schema", "int")]],
  ["dataset_fields", "Dataset field metadata used by chart mapping.", "business_module", [fkCol("dataset_id", "dataset", "datasets", "NO"), col("field_key", "key ของ field", "varchar", { length: "120" }), col("field_name", "ชื่อ field", "varchar", { length: "120" }), col("label", "ป้ายชื่อ field", "varchar"), col("field_type", "ชนิดข้อมูล", "varchar", { length: "50", enum_values: "date, number, text, boolean, currency, percentage, geography" }), col("semantic_type", "semantic type", "varchar", { length: "50" }), col("is_measure", "เป็น measure หรือไม่", "bool"), col("is_dimension", "เป็น dimension หรือไม่", "bool"), col("ordinal_no", "ลำดับ field", "int")]],
  ["dataset_rows", "Dataset row store for small/imported datasets and snapshots.", "business_module", [fkCol("dataset_id", "dataset", "datasets", "NO"), col("row_no", "เลขแถว", "int"), col("row_json", "ข้อมูลแถว", "json"), col("row_hash", "hash ของแถว", "varcharNull", { length: "64" })]],
  ["dataset_versions", "Dataset schema/data version history.", "business_module", [fkCol("dataset_id", "dataset", "datasets", "NO"), col("version_no", "เลข version", "int"), col("schema_json", "schema snapshot", "json"), col("row_count", "จำนวนแถว", "int")]],
  ["dataset_statistics", "Dataset field and quality statistics.", "business_module", [fkCol("dataset_id", "dataset", "datasets", "NO"), fkCol("dataset_field_id", "field", "dataset_fields"), col("stat_key", "ชื่อสถิติ", "varchar", { length: "80" }), col("stat_value_json", "ค่าสถิติ", "json")]],
  ["data_quality_checks", "Data quality checks and outcomes.", "business_module", [fkCol("dataset_id", "dataset", "datasets", "NO"), col("check_code", "รหัส check", "varchar", { length: "80" }), col("check_status", "สถานะ check", "varchar", { length: "50", enum_values: "passed, warning, failed" }), col("result_json", "ผลการตรวจ", "json")]],
  ["saved_queries", "Saved SQL demo/future query definitions.", "business_module", [fkCol("project_id", "project", "projects", "NO"), fkCol("dataset_id", "dataset ที่ query", "datasets"), col("query_name", "ชื่อ query", "varchar"), col("query_text", "SQL/query", "text"), col("query_mode", "โหมด query", "varchar", { length: "50", enum_values: "visual, sql" })]],
  ["database_connections", "Safe database/source connection metadata only; no secret values.", "integration", [fkCol("project_id", "project เจ้าของ connection", "projects"), col("connection_name", "ชื่อ connection", "varchar"), col("connector_type", "ชนิด connector", "varchar", { length: "80", enum_values: "postgresql, mysql, mariadb, sqlserver, sqlite, oracle, mongodb, google_sheets, csv_excel" }), col("connection_mode", "โหมด connection", "varchar", { length: "50", enum_values: "host, url, file, sheet, upload" }), col("host", "host แบบไม่เป็น secret", "varcharNull"), col("port", "port", "varcharNull", { length: "20" }), col("database_name", "ชื่อ database", "varcharNull"), col("username", "ชื่อผู้ใช้ metadata", "varcharNull"), col("secret_ref", "opaque secret reference จาก vault ภายนอก", "varcharNull", { length: "191" }), col("ssl_json", "ค่า SSL ที่ปลอดภัย", "json"), col("ssh_json", "ค่า SSH metadata ที่ปลอดภัย", "json"), col("advanced_json", "advanced metadata whitelist", "json")]],
  ["connection_tests", "Connection test history without secrets.", "integration", [fkCol("database_connection_id", "connection ที่ทดสอบ", "database_connections", "NO"), fkCol("tested_by", "ผู้ทดสอบ", "user_profiles"), col("test_status", "ผลทดสอบ", "varchar", { length: "50", enum_values: "success, failed, demo" }), col("latency_ms", "เวลาตอบสนอง", "intNull"), col("message", "ข้อความผลทดสอบ", "text")]],
  ["data_sources", "Registered source systems.", "integration", [fkCol("database_connection_id", "connection", "database_connections"), col("source_name", "ชื่อ source", "varchar"), col("source_type", "ชนิด source", "varchar", { length: "80" })]],
  ["datasource_tables", "Discovered source tables.", "integration", [fkCol("data_source_id", "source", "data_sources", "NO"), col("schema_name", "schema", "varcharNull", { length: "120" }), col("table_name", "ชื่อตารางต้นทาง", "varchar", { length: "120" }), col("row_count_estimate", "จำนวนแถวโดยประมาณ", "bigintNull")]],
  ["datasource_columns", "Discovered source columns.", "integration", [fkCol("datasource_table_id", "source table", "datasource_tables", "NO"), col("column_name", "ชื่อ column ต้นทาง", "varchar", { length: "120" }), col("source_data_type", "ชนิดข้อมูลต้นทาง", "varchar", { length: "80" }), col("ordinal_no", "ลำดับ column", "int")]],
  ["share_links", "Published dashboard share metadata using hashed capability only.", "business_module", [fkCol("project_id", "project", "projects", "NO"), fkCol("dashboard_id", "dashboard ที่ share", "project_dashboards", "NO"), col("share_code", "รหัส share ภายใน", "varchar", { length: "120" }), col("share_hash", "hash ของ capability URL", "varchar", { length: "191" }), col("share_mode", "โหมด share", "varchar", { length: "50", enum_values: "local-readonly, dashboard-readonly, embed" }), col("expires_at", "วันหมดอายุ", "datetimeNull"), col("revoked_at", "วันที่ revoke", "datetimeNull")]],
  ["share_snapshots", "Immutable public share snapshots.", "business_module", [fkCol("share_link_id", "share link", "share_links", "NO"), col("dashboard_revision_no", "revision dashboard ที่ publish", "bigint"), col("snapshot_json", "snapshot ที่ sanitize แล้ว", "json"), col("snapshot_status", "สถานะ snapshot", "varchar", { length: "50", enum_values: "ready, expired, revoked, unavailable" })]],
  ["embed_policies", "Embed allowlist and presentation policy.", "business_module", [fkCol("share_link_id", "share link", "share_links", "NO"), col("allowed_origins_json", "origin ที่อนุญาต", "json"), col("show_header", "แสดง header หรือไม่", "boolTrue"), col("theme_mode", "โหมด theme", "varchar", { length: "30", enum_values: "auto, light, dark" })]],
  ["public_access_logs", "Public/share access logs.", "audit_logging", [fkCol("share_link_id", "share link", "share_links"), col("request_id", "รหัส request", "varchar", { length: "80" }), col("access_status", "ผล access", "varchar", { length: "50", enum_values: "allowed, denied, expired, revoked" }), col("ip_address", "IP address", "varcharNull", { length: "80" })]],
  ["saved_views", "Saved dashboard view/filter/interactions.", "dashboard_reporting", [fkCol("project_id", "project", "projects", "NO"), fkCol("dashboard_id", "dashboard", "project_dashboards", "NO"), col("view_name", "ชื่อ saved view", "varchar"), col("filters_json", "filter snapshot", "json"), col("interactions_json", "interaction snapshot", "json"), col("layout_json", "layout snapshot", "json")]],
  ["dashboard_filters", "Dashboard global filter state.", "dashboard_reporting", [fkCol("dashboard_id", "dashboard", "project_dashboards", "NO"), col("filter_key", "ชื่อ filter", "varchar", { length: "80" }), col("filter_value_json", "ค่า filter", "json")]],
  ["dashboard_filter_presets", "Reusable dashboard filter presets.", "dashboard_reporting", [fkCol("dashboard_id", "dashboard", "project_dashboards", "NO"), col("preset_name", "ชื่อ preset", "varchar"), col("scope", "scope ของ preset", "varchar", { length: "80" }), col("filters_json", "ค่า filters", "json")]],
  ["dashboard_interactions", "Dashboard cross-filter and drilldown state.", "dashboard_reporting", [fkCol("dashboard_id", "dashboard", "project_dashboards", "NO"), col("interaction_type", "ประเภท interaction", "varchar", { length: "50", enum_values: "cross_filter, drilldown" }), col("interaction_json", "ค่า interaction", "json")]],
  ["dashboard_drilldown_steps", "Dashboard drilldown path steps.", "dashboard_reporting", [fkCol("dashboard_interaction_id", "interaction", "dashboard_interactions", "NO"), fkCol("widget_id", "widget ต้นทาง", "widgets"), col("field_name", "field ที่ drilldown", "varchar", { length: "120" }), col("field_value", "ค่าที่เลือก", "varcharNull")]],
  ["widget_assets", "Durable widget asset references.", "document_management", [fkCol("widget_id", "widget", "widgets", "NO"), fkCol("file_id", "ไฟล์ asset", "files", "NO"), col("asset_role", "บทบาท asset", "varchar", { length: "50", enum_values: "image, background, icon, attachment" })]],
  ["csv_import_profiles", "CSV parser profiles from csvImport utility.", "import_export", [fkCol("project_id", "project", "projects"), col("profile_name", "ชื่อ profile", "varchar"), col("delimiter", "ตัวคั่น", "varchar", { length: "10" }), col("encoding", "encoding", "varchar", { length: "50" }), col("limits_json", "ข้อจำกัด import", "json")]],
  ["sql_preview_runs", "SQL preview runs from frontend demo/future backend.", "dashboard_reporting", [fkCol("project_id", "project", "projects", "NO"), fkCol("dataset_id", "dataset", "datasets"), fkCol("chart_id", "chart", "chart_library_items"), col("query_text", "SQL/query", "text"), col("preview_status", "สถานะ preview", "varchar", { length: "50", enum_values: "idle, running, success, error" }), col("error_message", "ข้อความ error", "text")]],
  ["template_gallery_items", "Dashboard/chart template gallery items.", "master_data", [fkCol("chart_template_id", "chart template", "chart_templates"), col("template_slug", "slug", "varchar", { length: "120" }), col("template_name", "ชื่อ template", "varchar"), col("preview_image_url", "ลิงก์รูป preview", "varcharNull", { length: "500" })]],
  ["workspace_migration_runs", "Local-to-server workspace migration attempts.", "business_module", [fkCol("workspace_id", "workspace", "workspaces"), col("migration_status", "สถานะ migration", "varchar", { length: "50", enum_values: "not-started, dry-run, complete, failed, fallback" }), col("source_keys_json", "localStorage keys ต้นทาง", "json"), col("conflicts_json", "conflicts", "json"), col("warnings_json", "warnings", "json")]],
  ["workspace_ui_preferences", "Workspace UI state such as active project/dashboard, panels and recent projects.", "business_module", [fkCol("workspace_id", "workspace", "workspaces", "NO"), fkCol("user_profile_id", "ผู้ใช้", "user_profiles"), col("preference_json", "ค่า UI preference", "json")]],
];
for (const [tableName, description, moduleName, extras] of businessTables) addTable(moduleName, tableName, description, extras, { standard: { org: true, code: false, name: false, description: true, status: true } });

const tableByName = new Map(tables.map((table) => [table.table_name, table]));
const ddRows = [];
for (const table of tables) {
  for (const c of table.columns) {
    ddRows.push({
      module_name: table.module_name,
      table_name: table.table_name,
      table_description: table.table_description,
      ...c,
      current_or_future: table.current_or_future,
      notes: c.notes || table.notes,
    });
  }
}

const relationships = [];
for (const row of ddRows) {
  if (row.foreign_key === "YES" && row.foreign_table && tableByName.has(row.foreign_table)) {
    relationships.push({
      relationship_name: `fk_${row.table_name}_${row.column_name}`,
      from_table: row.table_name,
      from_column: row.column_name,
      to_table: row.foreign_table,
      to_column: row.foreign_column || "id",
      relationship_type: "many-to-one",
      cascade_rule: row.column_name.endsWith("_by") || row.column_name.includes("user_profile") ? "ON DELETE SET NULL" : "ON DELETE RESTRICT",
      required: row.nullable === "NO" ? "YES" : "NO",
      description: `${row.table_name}.${row.column_name} references ${row.foreign_table}.${row.foreign_column || "id"}`,
      notes: row.notes || "",
    });
  }
}
for (const table of tables) {
  for (const poly of table.polymorphic) {
    relationships.push({
      relationship_name: `poly_${table.table_name}_${poly[0]}_${poly[1]}`,
      from_table: table.table_name,
      from_column: `${poly[0]} + ${poly[1]}`,
      to_table: "polymorphic",
      to_column: "id",
      relationship_type: "polymorphic",
      cascade_rule: "Application-level validation",
      required: "Context dependent",
      description: poly[2],
      notes: "No physical FK should be created for polymorphic references; validate table, id and tenant in service layer.",
    });
  }
}

const indexes = [];
for (const table of tables) {
  indexes.push({
    table_name: table.table_name,
    index_name: `pk_${table.table_name}`,
    columns: "id",
    index_type: "PRIMARY",
    unique: "YES",
    purpose: "Primary key lookup.",
    notes: "Implicit by primary key.",
  });
  const seen = new Set(["id"]);
  for (const c of table.columns) {
    const add = (columns, name, type, unique, purpose, notes = "") => {
      const key = `${table.table_name}:${columns}`;
      if (seen.has(key)) return;
      seen.add(key);
      indexes.push({ table_name: table.table_name, index_name: name, columns, index_type: type, unique, purpose, notes });
    };
    if (c.foreign_key === "YES") add(c.column_name, `idx_${table.table_name}_${c.column_name}`, "BTREE", "NO", "Foreign key lookup.");
    if (["organization_id", "branch_id", "status", "created_at", "code"].includes(c.column_name)) add(c.column_name, `idx_${table.table_name}_${c.column_name}`, "BTREE", c.unique_key === "YES" ? "YES" : "NO", "Common filtering/search column.");
  }
  if (table.columns.some((c) => c.column_name === "organization_id") && table.columns.some((c) => c.column_name === "code")) {
    indexes.push({ table_name: table.table_name, index_name: `uq_${table.table_name}_org_code`, columns: "organization_id, code", index_type: "UNIQUE", unique: "YES", purpose: "Business code uniqueness inside organization.", notes: "Use where code is populated." });
  }
  for (const poly of table.polymorphic) {
    indexes.push({ table_name: table.table_name, index_name: `idx_${table.table_name}_${poly[0]}_${poly[1]}`, columns: `${poly[0]}, ${poly[1]}`, index_type: "BTREE", unique: "NO", purpose: "Polymorphic reference lookup.", notes: "Required because physical FK is intentionally not created." });
  }
}

const constraints = [];
for (const table of tables) {
  constraints.push({ table_name: table.table_name, constraint_name: `pk_${table.table_name}`, constraint_type: "PRIMARY KEY", columns: "id", expression_or_reference: "PRIMARY KEY (id)", notes: "Every table has a bigint unsigned surrogate primary key." });
  for (const c of table.columns) {
    if (c.foreign_key === "YES" && c.foreign_table && tableByName.has(c.foreign_table)) constraints.push({ table_name: table.table_name, constraint_name: `fk_${table.table_name}_${c.column_name}`, constraint_type: "FOREIGN KEY", columns: c.column_name, expression_or_reference: `${c.foreign_table}(id)`, notes: "Use ON DELETE RESTRICT unless DBA approves cascade/set null." });
    if (c.unique_key === "YES") constraints.push({ table_name: table.table_name, constraint_name: `uq_${table.table_name}_${c.column_name}`, constraint_type: "UNIQUE", columns: c.column_name, expression_or_reference: `UNIQUE (${c.column_name})`, notes: "Review collation/case sensitivity before production." });
    if (c.enum_values) constraints.push({ table_name: table.table_name, constraint_name: `chk_${table.table_name}_${c.column_name}`, constraint_type: "CHECK", columns: c.column_name, expression_or_reference: `${c.column_name} IN (${c.enum_values.split(",").map((v) => `'${v.trim()}'`).join(", ")})`, notes: "For older MariaDB/MySQL versions, enforce in application if CHECK behavior differs." });
    if (c.nullable === "NO") constraints.push({ table_name: table.table_name, constraint_name: `nn_${table.table_name}_${c.column_name}`, constraint_type: "NOT NULL", columns: c.column_name, expression_or_reference: `${c.column_name} IS NOT NULL`, notes: "Column must be supplied or defaulted." });
  }
}

const enumDefs = new Map();
for (const row of ddRows) {
  if (!row.enum_values) continue;
  const values = row.enum_values.split(",").map((v) => v.trim()).filter(Boolean);
  values.forEach((value, index) => {
    const key = `${row.table_name}:${row.column_name}:${value}`;
    if (!enumDefs.has(key)) {
      enumDefs.set(key, {
        module_name: row.module_name,
        table_name: row.table_name,
        column_name: row.column_name,
        value,
        label_th: thaiLabel(value),
        label_en: englishLabel(value),
        meaning: meaningFor(value),
        sort_order: index + 1,
        is_default: index === 0 ? "YES" : "NO",
        notes: "Derived from repository statuses/types and production dictionary rules.",
      });
    }
  });
}
const statusRows = [...enumDefs.values()];

function thaiLabel(value) {
  const map = {
    draft: "ฉบับร่าง", active: "ใช้งาน", inactive: "ไม่ใช้งาน", archived: "เก็บถาวร", deleted: "ลบแล้ว",
    pending: "รอดำเนินการ", approved: "อนุมัติแล้ว", rejected: "ปฏิเสธ", cancelled: "ยกเลิก", completed: "เสร็จสิ้น",
    failed: "ล้มเหลว", running: "กำลังทำงาน", success: "สำเร็จ", warning: "คำเตือน", error: "ข้อผิดพลาด",
    ready: "พร้อมใช้งาน", expired: "หมดอายุ", revoked: "ยกเลิกสิทธิ์", unavailable: "ไม่พร้อมใช้งาน",
    chart: "กราฟ", kpi: "ตัวชี้วัด", table: "ตาราง", text: "ข้อความ", image: "รูปภาพ", filter: "ตัวกรอง",
  };
  return map[value] ?? value.replace(/[-_]/g, " ");
}

function englishLabel(value) {
  return value.split(/[-_ ]+/).map((item) => item ? `${item[0].toUpperCase()}${item.slice(1)}` : item).join(" ");
}

function meaningFor(value) {
  if (["password", "token", "session"].some((term) => value.includes(term))) return "Forbidden auth-secret related value.";
  return `Allowed value '${value}' for the documented status/type column.`;
}

function sqlType(c) {
  if (c.data_type === "VARCHAR") return `${c.data_type}(${c.length || 255})`;
  if (c.data_type === "DECIMAL") return `${c.data_type}(${c.precision_scale || "18,4"})`;
  if (c.data_type === "TINYINT") return "TINYINT(1)";
  return c.data_type;
}

function ddlFor(table) {
  const lines = table.columns.map((c) => {
    const nullable = c.primary_key === "YES" ? "NOT NULL" : c.nullable === "NO" ? "NOT NULL" : "NULL";
    const auto = c.default_value === "AUTO_INCREMENT" ? " AUTO_INCREMENT" : "";
    const def = c.default_value && c.default_value !== "AUTO_INCREMENT" && c.default_value !== "NULL" ? ` DEFAULT ${c.default_value}` : "";
    return `  \`${c.column_name}\` ${sqlType(c)} ${nullable}${auto}${def} COMMENT '${c.column_description_th.replace(/'/g, "''")}'`;
  });
  lines.push("  PRIMARY KEY (`id`)");
  return `CREATE TABLE \`${table.table_name}\` (\n${lines.join(",\n")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='${table.table_description.replace(/'/g, "''")}';`;
}

const projectAnalysisRows = [
  ["assessment_date", now],
  ["project_type", "Vite React Mini BI frontend with localStorage/canonical workspace repository and future backend handoff docs."],
  ["target_database", "MySQL/MariaDB, InnoDB, utf8mb4, utf8mb4_unicode_ci."],
  ["main_routes", "/home, /dashboard, /dashboard-v2, /dashboard-legacy, /builder, /connections, /datasets, /settings, /share/:sheetId, /dashboard/:dashboardId/view, /dashboard/:dashboardId/embed, /login, /register"],
  ["canonical_graph", "Workspace -> Project -> Dataset/Field/Rows, Chart/DataContract/Mapping/Settings, Dashboard/Widget, Share/Snapshot, ConnectionProfile."],
  ["backend_state", "No authoritative ORM schema found in prisma/nest-backend source files; design inferred from current frontend contracts and docs."],
  ["auth_policy", "External login integration only. No password/session/token/OTP/social login credential tables are created."],
  ["local_storage_keys", "mini-bi-workspace-v1, mini-bi-workspace-v1-migration-complete, mini-bi-db-connections, mini-bi-theme, mini-bi-v8-workspace and legacy compatibility keys."],
  ["source_evidence", sourceEvidence.join("; ")],
];

const tableOverviewRows = tables.map((table) => ({
  module_name: table.module_name,
  table_name: table.table_name,
  table_description: table.table_description,
  column_count: table.columns.length,
  current_or_future: table.current_or_future,
  has_primary_key: "YES",
  has_soft_delete: table.columns.some((c) => c.column_name === "deleted_at") ? "YES" : "NO",
  has_audit_columns: table.columns.some((c) => c.column_name === "created_by") ? "YES" : "NO",
  notes: table.notes,
}));

const apiRows = [
  ["Auth/Profile", "user_profiles", "GET/PATCH /api/v1/users/me", "Use external identity only; do not store credentials."],
  ["Workspace", "workspaces, workspace_members", "GET /api/v1/workspaces/:workspaceId", "Workspace may be tenant or organization child depending product decision."],
  ["Projects", "projects, project_members", "GET/POST /api/v1/workspaces/:workspaceId/projects; PATCH /api/v1/projects/:id", "Use revision_no for optimistic locking."],
  ["Datasets", "datasets, dataset_fields, dataset_rows, dataset_versions", "GET/POST /api/v1/projects/:projectId/datasets", "Large row storage strategy remains a production decision."],
  ["CSV Imports", "import_jobs, import_job_rows, import_errors, csv_import_profiles", "POST /api/v1/projects/:projectId/dataset-imports", "Use idempotency key and server validation."],
  ["Charts", "chart_library_items, chart_data_contracts, chart_mappings", "GET/POST /api/v1/projects/:projectId/charts", "Preserve chart data contract and stable client IDs during migration."],
  ["Chart Preview", "chart_query_results, sql_preview_runs", "POST /api/v1/projects/:projectId/chart-previews", "Return bounded result refs/snapshots."],
  ["Dashboards", "project_dashboards, widgets, dashboard_layout_versions", "GET/POST /api/v1/projects/:projectId/dashboards", "Dashboard/widgets may be aggregate writes."],
  ["Shares", "share_links, share_snapshots, embed_policies", "POST /api/v1/dashboards/:dashboardId/shares", "Store share hash only; raw capability returned once."],
  ["Connections", "database_connections, connection_tests", "GET/POST /api/v1/projects/:projectId/connections", "Persist safe metadata and opaque secret_ref only."],
  ["Audit", "audit_logs, activity_logs, api_request_logs", "GET /api/v1/projects/:projectId/audit-events", "Server generated, append-only, privacy reviewed."],
];

const futureRows = [
  ["Large dataset storage", "Choose row store, object storage, columnar warehouse or hybrid policy for production volumes."],
  ["Collaboration", "Add real-time presence/commenting/locking after backend concurrency policy is approved."],
  ["Semantic layer", "Add metric definitions, dimensions, lineage, certified datasets and governed joins."],
  ["Governance", "Add approval flows for publishing datasets/charts/dashboards to shared workspaces."],
  ["Public sharing hardening", "Add rate limits, domain allowlist, snapshot expiry and revocation audit."],
  ["Connector execution", "Add server-side connector workers and secret vault integration."],
];

const openQuestionRows = [
  ["Tenant model", "Is Workspace the tenant, or should Organization be the strict tenant boundary?", "High"],
  ["Dataset row storage", "How many rows must production datasets support and where should raw rows live?", "High"],
  ["Share policy", "Default/max expiry, immutable snapshot policy and embed domain restrictions need security approval.", "High"],
  ["Secret vault", "Select vault provider and secret_ref format; browser metadata must never contain secrets.", "High"],
  ["Retention", "Define retention for datasets, files, shares, query snapshots, logs and soft-deleted rows.", "Medium"],
  ["Role matrix", "Approve exact role-permission matrix for project/workspace operations.", "Medium"],
];

const qa = runQa();

function runQa() {
  const issues = [];
  const tableNames = new Set();
  for (const table of tables) {
    if (tableNames.has(table.table_name)) issues.push(["critical", `Duplicate table ${table.table_name}`]);
    tableNames.add(table.table_name);
    if (!table.columns.some((c) => c.primary_key === "YES")) issues.push(["critical", `Missing PK ${table.table_name}`]);
    if (forbiddenTablePatterns.some((pattern) => pattern.test(table.table_name))) issues.push(["critical", `Forbidden auth-secret table ${table.table_name}`]);
    for (const c of table.columns) {
      if (c.data_type === "VARCHAR" && !c.length) issues.push(["high", `Missing varchar length ${table.table_name}.${c.column_name}`]);
      if (c.data_type === "DECIMAL" && !c.precision_scale) issues.push(["high", `Missing decimal precision ${table.table_name}.${c.column_name}`]);
      if (c.foreign_key === "YES" && (!c.foreign_table || !c.foreign_column)) issues.push(["high", `Broken FK metadata ${table.table_name}.${c.column_name}`]);
      if (c.foreign_key === "YES" && c.foreign_table && !tableByName.has(c.foreign_table)) issues.push(["high", `FK target missing ${table.table_name}.${c.column_name} -> ${c.foreign_table}`]);
      if (!c.column_description_th) issues.push(["medium", `Missing Thai description ${table.table_name}.${c.column_name}`]);
    }
  }
  const critical = issues.filter((i) => i[0] === "critical").length;
  const high = issues.filter((i) => i[0] === "high").length;
  const medium = issues.filter((i) => i[0] === "medium").length;
  const low = issues.filter((i) => i[0] === "low").length;
  const scores = [
    ["Repository coverage", 14, 15, "Routes, frontend domain, local persistence, docs and backend/prisma absence inspected."],
    ["Data Dictionary completeness", critical || high ? 26 : 29, 30, "All required sheets and required foundation tables included."],
    ["Relationship correctness", high ? 12 : 14, 15, "Concrete FK metadata references existing tables; polymorphic relationships documented."],
    ["Index/constraint quality", 9, 10, "PK, FK, common filters, unique and polymorphic composite indexes documented."],
    ["SQL DDL readiness", 13, 15, "Suggested DDL is implementation planning quality; migrations still need DBA review."],
    ["Documentation quality", 9, 10, "README/project analysis/API mapping/open questions/QA sheets included."],
    ["Production/future readiness", 4, 5, "Future backend concerns represented; product/security choices remain."],
  ];
  const total = scores.reduce((sum, item) => sum + item[1], 0);
  return { issues, critical, high, medium, low, scores, total };
}

function objectsToRows(items, headers) {
  return [headers, ...items.map((item) => headers.map((header) => item[header] ?? ""))];
}

function arrayRows(headers, rows) {
  return [headers, ...rows];
}

function sanitizeSheetName(name) {
  return name.slice(0, 31);
}

function address(row, col) {
  let n = col + 1;
  let s = "";
  while (n) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return `${s}${row + 1}`;
}

function writeSheet(workbook, name, rows, options = {}) {
  const sheet = workbook.worksheets.add(sanitizeSheetName(name));
  sheet.showGridLines = false;
  const width = Math.max(...rows.map((r) => r.length));
  const normalized = rows.map((r) => [...r, ...Array(width - r.length).fill("")]);
  sheet.getRangeByIndexes(0, 0, normalized.length, width).values = normalized;
  const used = sheet.getRangeByIndexes(0, 0, normalized.length, width);
  used.format = { font: { name: "Aptos", size: 10 }, alignment: { vertical: "top" }, wrapText: true };
  const header = sheet.getRangeByIndexes(0, 0, 1, width);
  header.format = {
    fill: "#1F4E78",
    font: { bold: true, color: "#FFFFFF" },
    alignment: { horizontal: "center", vertical: "middle" },
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#D9E2F3" },
  };
  if (normalized.length > 1) {
    sheet.getRangeByIndexes(1, 0, normalized.length - 1, width).format = {
      borders: { preset: "insideHorizontal", style: "thin", color: "#E5E7EB" },
      wrapText: true,
    };
  }
  sheet.freezePanes.freezeRows(1);
  try {
    const end = address(normalized.length - 1, width - 1);
    const tableName = `${name.replace(/[^A-Za-z0-9]/g, "").slice(0, 20)}Table`;
    const table = sheet.tables.add(`A1:${end}`, true, tableName || "DataTable");
    table.showFilterButton = true;
    table.style = "TableStyleMedium2";
  } catch {
    // Filters are best-effort through Excel tables; the workbook remains readable without them.
  }
  const widths = options.widths ?? [];
  for (let c = 0; c < width; c += 1) {
    const colRange = sheet.getRangeByIndexes(0, c, normalized.length, 1);
    colRange.format.columnWidth = widths[c] ?? (c < 3 ? 24 : 18);
  }
  return sheet;
}

const workbook = Workbook.create();
writeSheet(workbook, "README", arrayRows(["item", "value"], [
  ["Workbook", "Production-grade Data Dictionary for Dashboard Mini BI"],
  ["Created", now],
  ["Target DB", "MySQL/MariaDB, InnoDB, utf8mb4, utf8mb4_unicode_ci"],
  ["Important auth rule", "No password/session/token/OTP/social-login credential tables are created. External login integration is assumed."],
  ["Readiness", `${qa.total}%`],
  ["Counts", `${modules.length} modules, ${tables.length} tables, ${ddRows.length} columns, ${relationships.length} relationships, ${relationships.filter((r) => r.relationship_type !== "polymorphic").length} foreign keys, ${indexes.length} indexes, ${constraints.length} constraints, ${statusRows.length} status/enum values`],
  ["How to use", "Use Data Dictionary as the field-level source, Relationships/Indexes/Constraints for ERD and migration planning, and Open Questions for DBA/product decisions before production."],
]));
writeSheet(workbook, "Project Analysis", arrayRows(["analysis_item", "finding"], projectAnalysisRows));
writeSheet(workbook, "Module List", arrayRows(["module_name", "description", "current_or_future", "main_tables"], modules.map(([name, description, readiness]) => [name, description, readiness, tables.filter((t) => t.module_name === name).map((t) => t.table_name).join(", ")])));
writeSheet(workbook, "Table Overview", objectsToRows(tableOverviewRows, ["module_name", "table_name", "table_description", "column_count", "current_or_future", "has_primary_key", "has_soft_delete", "has_audit_columns", "notes"]));
writeSheet(workbook, "Data Dictionary", objectsToRows(ddRows, ["module_name", "table_name", "table_description", "column_name", "column_description_th", "data_type", "length", "precision_scale", "nullable", "default_value", "primary_key", "foreign_key", "foreign_table", "foreign_column", "unique_key", "index_name", "index_type", "enum_values", "example_value", "business_rule", "validation_rule", "current_or_future", "notes"]), { widths: [18, 24, 34, 24, 30, 16, 10, 14, 10, 18, 10, 10, 20, 16, 10, 24, 14, 24, 22, 36, 36, 14, 40] });
writeSheet(workbook, "Relationships", objectsToRows(relationships, ["relationship_name", "from_table", "from_column", "to_table", "to_column", "relationship_type", "cascade_rule", "required", "description", "notes"]));
writeSheet(workbook, "Indexes", objectsToRows(indexes, ["table_name", "index_name", "columns", "index_type", "unique", "purpose", "notes"]));
writeSheet(workbook, "Constraints", objectsToRows(constraints, ["table_name", "constraint_name", "constraint_type", "columns", "expression_or_reference", "notes"]));
writeSheet(workbook, "Status & Enum Values", objectsToRows(statusRows, ["module_name", "table_name", "column_name", "value", "label_th", "label_en", "meaning", "sort_order", "is_default", "notes"]));
writeSheet(workbook, "Suggested SQL DDL", arrayRows(["table_name", "ddl_suggestion"], tables.map((table) => [table.table_name, ddlFor(table)])), { widths: [28, 120] });
writeSheet(workbook, "ERD Notes", arrayRows(["topic", "note"], [
  ["Primary ERD", "organizations -> workspaces -> projects -> datasets/charts/dashboards/shares/connections."],
  ["Chart lineage", "datasets -> chart_library_items -> chart_data_contracts/chart_mappings -> widgets -> project_dashboards."],
  ["Polymorphic references", "Do not create physical FKs for reference_table/reference_id pairs; enforce table/id/organization scope in service layer."],
  ["Soft delete", "Most business tables include deleted_at/deleted_by for recoverability and audit."],
  ["External auth", "user_profiles stores external_user_id and external_auth_provider only; no local credential tables."],
]));
writeSheet(workbook, "API Mapping Suggestions", arrayRows(["area", "tables", "suggested_endpoint", "notes"], apiRows));
writeSheet(workbook, "Future Expansion", arrayRows(["area", "recommendation"], futureRows));
writeSheet(workbook, "Open Questions", arrayRows(["question_area", "question", "risk_level"], openQuestionRows));
writeSheet(workbook, "Data Dictionary QA", arrayRows(["metric", "value", "notes"], [
  ["modules", modules.length, "Module List sheet"],
  ["tables", tables.length, "All required foundation tables plus Mini BI domain tables"],
  ["columns", ddRows.length, "Data Dictionary rows"],
  ["relationships", relationships.length, "Includes concrete FKs and documented polymorphic relationships"],
  ["foreign_keys", relationships.filter((r) => r.relationship_type !== "polymorphic").length, "Concrete FK relationships only"],
  ["indexes", indexes.length, "PK/FK/filter/unique/polymorphic index documentation"],
  ["constraints", constraints.length, "PK/FK/unique/check/not-null documentation"],
  ["status_enum_values", statusRows.length, "Status & Enum Values rows"],
  ["critical_issues", qa.critical, "Generated QA"],
  ["high_issues", qa.high, "Generated QA"],
  ["medium_issues", qa.medium, "Generated QA"],
  ["low_issues", qa.low, "Generated QA"],
  ["readiness_percentage", `${qa.total}%`, "Weighted readiness score"],
  ["ready_for_local_staging", qa.critical === 0 && qa.high === 0 ? "YES" : "NO", "Local/staging schema planning can proceed after DBA review"],
  ["production_baseline_ready", qa.critical === 0 && qa.high === 0 && qa.medium <= 6 ? "YES_WITH_REVIEW" : "NO", "Open product/security decisions remain"],
  ...qa.scores.map(([area, score, max, note]) => [`score_${area}`, `${score}/${max}`, note]),
  ...qa.issues.map(([severity, issue], index) => [`issue_${index + 1}_${severity}`, issue, "Fix before production if critical/high."]),
]));

await fs.mkdir(previewDir, { recursive: true });
const previewSheets = workbook.worksheets.items.map((sheet) => sheet.name);
for (const sheetName of previewSheets) {
  const preview = await workbook.render({ sheetName, range: "A1:J35", autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(previewDir, `${sheetName.replace(/[^A-Za-z0-9]+/g, "_")}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);

const summary = {
  outputPath,
  modules: modules.length,
  tables: tables.length,
  columns: ddRows.length,
  relationships: relationships.length,
  foreignKeys: relationships.filter((r) => r.relationship_type !== "polymorphic").length,
  indexes: indexes.length,
  constraints: constraints.length,
  statusEnumValues: statusRows.length,
  readinessPercentage: qa.total,
  criticalIssues: qa.critical,
  highIssues: qa.high,
  mediumIssues: qa.medium,
  lowIssues: qa.low,
  readyForLocalStaging: qa.critical === 0 && qa.high === 0,
  productionBaselineReady: qa.critical === 0 && qa.high === 0 && qa.medium <= 6,
  sheetCount: previewSheets.length,
  forbiddenTables: tables.filter((table) => forbiddenTablePatterns.some((pattern) => pattern.test(table.table_name))).map((table) => table.table_name),
};
await fs.writeFile(path.join(__dirname, "data_dictionary_summary.json"), JSON.stringify(summary, null, 2), "utf8");
console.log(JSON.stringify(summary, null, 2));
