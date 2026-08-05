import { useMemo } from "react";
import { useStore } from "@app/store/useStore";

const translations = {
  en: {
    common: {
      home: "Home",
      dashboard: "Dashboard",
      builder: "Builder",
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      delete: "Delete",
      edit: "Edit",
      reset: "Reset",
      refresh: "Refresh",
      actions: "Actions",
      rows: "Rows",
      fields: "Fields",
      database: "Database",
      table: "Table",
      readOnly: "Read only",
      notSelected: "Not selected",
      unavailable: "Unavailable",
      language: "Language",
      signIn: "Sign in",
    },
    app: {
      name: "Mini BI",
      brandLine: "",
      searchPlaceholder: "Search",
      newChart: "New chart",
      insights: "Panel",
      openMenu: "Open navigation",
      closeMenu: "Close navigation",
      toggleTheme: "Toggle theme",
      toggleKpi: "Toggle KPI strip",
      signOut: "Sign out",
      workspacePanel: "Workspace panel",
      navigation: "Navigation",
      collapseSidebar: "Collapse sidebar",
      expandSidebar: "Expand sidebar",
      dashboardControls: "Dashboard controls",
      analysis: "Analysis",
      builderQuery: "Builder query",
      shareDashboard: "Share dashboard",
      hideShare: "Hide share",
      clearSheet: "Clear sheet",
      clearSheetConfirm: "Clear all charts from this sheet?",
      generateReadonlyLink: "Generate read-only link",
      copyLink: "Copy link",
      copied: "Copied",
      queryCache: "Query cache",
      refreshingInsights: "Refreshing insights...",
      insightsWaiting: "Insights will appear here as dashboard charts refresh.",
      liveSqlStatus: "Live SQL status",
      state: "State",
      output: "Output",
      queryInspectorNote: "The full SQL preview appears in the Builder config pane and updates from your current field mappings.",
      cacheContext: "Cache context",
      generatedLines: "Generated lines",
      entries: "Entries",
      lastSource: "Last source",
      lastRows: "Last rows",
      aggregate: "Aggregate",
      readyToInspect: "Ready to inspect",
      addTableAndFields: "Add a table and mapped fields",
    },
    home: {
      title: "Workspace",
      subtitle: "",
      newProject: "New project",
      projects: "Projects",
      projectLabel: "Project",
      noProjects: "No projects yet",
      noProjectsBody: "Create your first project.",
      addProject: "Add project",
      createWorkspace: "Create a new workspace",
      active: "Active",
      ready: "Ready",
      current: "Current",
      none: "None",
      sheets: "Sheets",
      dashboards: "Dashboards",
      activeItems: "Active items",
      context: "Context",
      lastUpdated: "Last updated",
      noSheet: "No sheet",
      noDashboard: "No dashboard",
      noRecentUpdates: "No recent updates",
      manageProject: "Manage",
      renameProject: "Rename project",
      deleteProject: "Delete",
      openProject: "Open",
      projectNameRequired: "Project name is required.",
      projectName: "Project name",
      projectNamePlaceholder: "",
      createProject: "Create project",
    },
    builder: {
      dataSources: "Data sources",
      dataSourcesBody: "",
      livePreview: "Live preview",
      preview: "Preview",
      previewAwaiting: "Awaiting configuration",
      previewAwaitingBody: "Map fields.",
      source: "Source: {table}{suffix}",
      sourceSuffix: " - {x} vs {y}",
      mapFieldsHint: "Map fields.",
      sqlReady: "SQL ready",
      sqlPending: "SQL pending",
      recommended: "Recommended",
      recommendedApplied: "Recommended and applied",
      live: "Live",
      queryPreview: "Query preview",
      generatedFromMappings: "Generated",
      waitingForSql: "Waiting for enough fields to generate SQL",
      chartConfiguration: "Chart configuration",
      savedToLibrary: "Saved.",
      blockersBeforeSave: "{count} blocker {noun} to resolve before saving.",
      cautionsBeforeSave: "{count} caution {noun} to review before saving.",
      alignedForSave: "Mappings and chart selections are aligned for saving.",
      queryBody: "Inspect the generated SQL and metadata before saving. It updates from your current field mappings.",
      waitingForMappings: "Waiting for mappings",
      copySql: "Copy SQL",
      selectTable: "Select a table",
      dragColumns: "Drag columns into X or Y",
      outputColumns: "Output columns",
      columnsAppear: "Columns will appear here",
      noParameters: "No bound parameters",
      generatedSql: "Generated SQL",
      readOnlySql: "Read only.",
      lines: "{count} lines",
      incomplete: "Incomplete",
      selectTableAndFields: "Select a table and map fields.",
      awaitingFields: "Awaiting fields",
      groupedAggregate: "Grouped aggregate",
      aggregateByDimension: "Aggregate by dimension",
      partialQuery: "Partial query",
      mappings: "Mappings",
      mappingsBody: "",
      mappedCount: "{count}/3 mapped",
      xAxis: "X axis",
      yAxis: "Y axis",
      grouping: "Grouping",
      dimension: "Dimension",
      measure: "Measure",
      optional: "Optional",
      xAxisHelper: "",
      yAxisHelper: "",
      yAxisBody: "",
      groupingHelper: "",
      dropInto: "Drop {field} into {label}",
      releaseToMap: "Release to map this field into this area.",
      dragColumnHere: "Drag a column here",
      autoAssign: "Drag a field here.",
      clearLabel: "Clear {label}",
      chartRecommendation: "Chart recommendation",
      applied: "Applied",
      suggested: "Suggested",
      confidence: "Confidence: {value}",
      useRecommended: "Recommended",
      useChart: "Use {label}",
      tryChart: "Try {label}",
      primaryVisuals: "Primary visuals",
      advancedVisuals: "Advanced visuals",
      validation: "Validation",
      resolveBlockers: "Resolve blockers before saving",
      configurationLooksGood: "Ready",
      blocker: "Blocker",
      guidance: "Guidance",
      savedToDashboard: "Saved to dashboard",
      readyWithCautions: "Ready",
      configurationReady: "Ready",
      blockersPreventingSave: "{count} blocker {noun} preventing save",
      completeMappingsToSave: "Complete required fields",
      discard: "Discard",
      deployChart: "Save chart",
      chooseTable: "Choose a table",
      saveAs: "Save as",
      saveAsPlaceholder: "e.g. Regional sales 2024",
      chartHeadline: "Chart headline",
      chartHeadlinePlaceholder: "Optional display title",
      selectTableBlockerTitle: "Select a table",
      selectTableBlockerMessage: "Select a table.",
      selectTableBlockerAction: "Pick a table.",
      chartReadyToSave: "Ready.",
    },
    share: {
      preparing: "Preparing shared view",
      loadingTitle: "Loading dashboard",
      loadingBody: "Please wait while the read-only dashboard is prepared.",
      linkUnavailable: "Link unavailable",
      notFoundTitle: "Dashboard not found",
      notFoundBody: "This shared link may have expired, been removed, or no longer has an available dashboard behind it.",
      goToSignIn: "Go to sign in",
      sharedView: "Shared view",
      readyForReview: "Ready for review",
      published: "Published shared view",
      availableCharts: "Available charts",
      availableChartsBody: "Prepared for secure read-only review.",
      visualizationMix: "Visualization mix",
      visualizationMixValue: "{count} types",
      visualizationMixBody: "Clear framing across the current dashboard layout.",
      primaryDataset: "Primary dataset",
      primaryDatasetBody: "Presented exactly as shared by the dashboard owner.",
      viewerNotes: "Viewer notes",
      viewerBody: "This shared link opens a stable presentation view with editing, layout changes, and builder actions disabled.",
      viewerOne: "Read-only access only",
      viewerTwo: "Shared chart layout preserved",
      viewerThree: "No sign-in required to review",
      noChartsYet: "No charts yet",
      noChartsTitle: "This shared dashboard has no charts",
      noChartsBody: "The owner has not published any visualizations to this read-only view yet. Check back later or ask them to republish the dashboard when content is ready.",
      viewOnly: "View only",
      trusted: "Trusted share link",
      sharedDashboard: "Shared dashboard",
      sharedBody: "A polished dashboard presentation prepared for external review. Viewing is enabled while editing, layout changes, and builder interactions remain disabled.",
      presentationStatus: "Presentation status",
      presentationBody: "Charts below are presented in a stable read-only layout so viewers can focus on the information being shared.",
      chartsVisible: "{count} charts visible",
      visualizationTypes: "{count} visualization types",
      access: "Access",
      signInForWorkspace: "Sign in for workspace access",
      chartPresented: "Presented in a polished read-only frame with editing controls disabled.",
      dimension: "Dimension",
      metric: "Metric",
      chartDetails: "Chart details",
    },
    chart: {
      notAvailable: "Not available",
      dataUnavailable: "Data unavailable",
      visualizationCouldNotLoad: "This visualization could not be loaded",
      noResults: "No results",
      hasNoData: "{type} has no data to display",
      readonlyNoRows: "This shared view is available, but the current chart configuration does not return any rows for review.",
      noRows: "The current chart configuration does not return any rows.",
      detailedView: "Detailed view",
      rawRowsFor: "Showing raw rows for {label}.",
      selectedDataPoint: "the selected data point",
      unsupportedChartType: "Unsupported chart type: {type}",
    },
    languageName: "English"
  },
  th: {},
};

translations.th = {
  common: {
    home: "หน้าหลัก",
    dashboard: "แดชบอร์ด",
    builder: "ตัวสร้างกราฟ",
    save: "บันทึก",
    cancel: "ยกเลิก",
    close: "ปิด",
    delete: "ลบ",
    edit: "แก้ไข",
    reset: "รีเซ็ต",
    refresh: "รีเฟรช",
    actions: "การทำงาน",
    rows: "แถว",
    fields: "ฟิลด์",
    database: "ฐานข้อมูล",
    table: "ตาราง",
    readOnly: "อ่านอย่างเดียว",
    notSelected: "ยังไม่ได้เลือก",
    unavailable: "ไม่พร้อมใช้งาน",
    language: "ภาษา",
    signIn: "เข้าสู่ระบบ",
  },
  app: {
    name: "Mini BI",
    brandLine: "",
    searchPlaceholder: "ค้นหา",
    newChart: "กราฟใหม่",
    insights: "แผงข้อมูล",
    openMenu: "เปิดเมนู",
    closeMenu: "ปิดเมนู",
    toggleTheme: "สลับธีม",
    toggleKpi: "สลับแถบ KPI",
    signOut: "ออกจากระบบ",
    workspacePanel: "แผงพื้นที่ทำงาน",
    navigation: "การนำทาง",
    collapseSidebar: "ย่อแถบด้านข้าง",
    expandSidebar: "ขยายแถบด้านข้าง",
    dashboardControls: "ตัวควบคุมแดชบอร์ด",
    analysis: "การวิเคราะห์",
    builderQuery: "คำสั่งตัวสร้างกราฟ",
    shareDashboard: "แชร์แดชบอร์ด",
    hideShare: "ซ่อนการแชร์",
    clearSheet: "ล้างชีต",
    clearSheetConfirm: "ล้างกราฟทั้งหมดจากชีตนี้หรือไม่",
    generateReadonlyLink: "สร้างลิงก์อ่านอย่างเดียว",
    copyLink: "คัดลอกลิงก์",
    copied: "คัดลอกแล้ว",
    queryCache: "แคชคำสั่ง",
    refreshingInsights: "กำลังรีเฟรชข้อมูลเชิงลึก...",
    insightsWaiting: "ข้อมูลเชิงลึกจะแสดงเมื่อกราฟในแดชบอร์ดรีเฟรช",
    liveSqlStatus: "สถานะ SQL สด",
    state: "สถานะ",
    output: "ผลลัพธ์",
    queryInspectorNote: "ตัวอย่าง SQL ฉบับเต็มอยู่ในแผงตั้งค่าตัวสร้างกราฟและอัปเดตตามการแมปฟิลด์ปัจจุบัน",
    cacheContext: "บริบทแคช",
    generatedLines: "บรรทัดที่สร้าง",
    entries: "รายการ",
    lastSource: "แหล่งล่าสุด",
    lastRows: "แถวล่าสุด",
    aggregate: "รวมค่า",
    readyToInspect: "พร้อมตรวจสอบ",
    addTableAndFields: "เพิ่มตารางและฟิลด์ที่แมป",
  },
  home: {
    title: "พื้นที่ทำงาน",
    subtitle: "",
    newProject: "โปรเจกต์ใหม่",
    projects: "โปรเจกต์",
    projectLabel: "โปรเจกต์",
    noProjects: "ยังไม่มีโปรเจกต์",
    noProjectsBody: "สร้างโปรเจกต์แรกของคุณ",
    addProject: "เพิ่มโปรเจกต์",
    createWorkspace: "สร้างพื้นที่ทำงานใหม่",
    active: "ใช้งาน",
    ready: "พร้อมใช้",
    current: "ปัจจุบัน",
    none: "ไม่มี",
    sheets: "ชีต",
    dashboards: "แดชบอร์ด",
    activeItems: "รายการที่ใช้งาน",
    context: "บริบท",
    lastUpdated: "อัปเดตล่าสุด",
    noSheet: "ไม่มีชีต",
    noDashboard: "ไม่มีแดชบอร์ด",
    noRecentUpdates: "ยังไม่มีการอัปเดต",
    manageProject: "จัดการ",
    renameProject: "เปลี่ยนชื่อโปรเจกต์",
    deleteProject: "ลบ",
    openProject: "เปิด",
    projectNameRequired: "ต้องระบุชื่อโปรเจกต์",
    projectName: "ชื่อโปรเจกต์",
    projectNamePlaceholder: "",
    createProject: "สร้างโปรเจกต์",
  },
  share: {
    loading: "กำลังโหลดมุมมองแชร์...",
    notFound: "ไม่พบแดชบอร์ดที่แชร์",
    notFoundBody: "ลิงก์นี้อาจหมดอายุหรือถูกลบแล้ว",
    returnHome: "กลับหน้าหลัก",
    sharedView: "มุมมองแชร์",
    sharedDashboard: "แดชบอร์ดที่แชร์",
    sharedBody: "แดชบอร์ดสำหรับรีวิวภายนอกที่ซ่อนการแก้ไขและเครื่องมือตัวสร้าง",
    viewOnly: "อ่านอย่างเดียว",
    trusted: "ลิงก์แชร์ที่เชื่อถือได้",
    signInForWorkspace: "เข้าสู่ระบบเพื่อเข้าถึงพื้นที่ทำงาน",
    noChartsYet: "ยังไม่มีกราฟ",
    noChartsTitle: "แดชบอร์ดที่แชร์นี้ยังไม่มีกราฟ",
    noChartsBody: "เจ้าของยังไม่ได้เผยแพร่ภาพข้อมูลในมุมมองอ่านอย่างเดียวนี้",
    chartsVisible: "แสดง {count} กราฟ",
    visualizationTypes: "ภาพข้อมูล {count} ประเภท",
    access: "การเข้าถึง",
    chartPresented: "แสดงในกรอบอ่านอย่างเดียวที่ปิดเครื่องมือแก้ไข",
    dimension: "มิติ",
    metric: "มาตรวัด",
    chartDetails: "รายละเอียดกราฟ",
  },
  chart: {
    notAvailable: "ไม่พร้อมใช้งาน",
    dataUnavailable: "ไม่มีข้อมูล",
    visualizationCouldNotLoad: "ไม่สามารถโหลดภาพข้อมูลนี้ได้",
    noResults: "ไม่พบผลลัพธ์",
    hasNoData: "{type} ไม่มีข้อมูลสำหรับแสดงผล",
    readonlyNoRows: "มุมมองแชร์พร้อมใช้งาน แต่กราฟนี้ไม่มีแถวข้อมูลสำหรับรีวิว",
    noRows: "การตั้งค่ากราฟปัจจุบันไม่ส่งคืนแถวข้อมูล",
    detailedView: "มุมมองรายละเอียด",
    rawRowsFor: "แสดงแถวดิบสำหรับ {label}",
    selectedDataPoint: "จุดข้อมูลที่เลือก",
    unsupportedChartType: "ไม่รองรับประเภทกราฟ: {type}",
  },
  languageName: "ไทย",
};

function decodeMojibakeString(value) {
  if (typeof value !== "string" || !/[\u00C3\u00C2\u00E0\u00E2]/.test(value)) return value;

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return /[\u0E00-\u0E7F]/.test(decoded) ? decoded : value;
  } catch {
    return value;
  }
}

function normalizeLocaleMessages(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeLocaleMessages(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeLocaleMessages(nestedValue)])
    );
  }

  return decodeMojibakeString(value);
}

translations.th = normalizeLocaleMessages(translations.th);

const DEFAULT_LOCALE = "th";

function resolvePath(source, path) {
  return String(path)
    .split(".")
    .reduce((value, segment) => (value == null ? undefined : value[segment]), source);
}

function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value == null ? `{${key}}` : String(value);
  });
}

export function translate(locale, key, params) {
  const activeLocale = translations[locale] ? locale : DEFAULT_LOCALE;
  const value =
    resolvePath(translations[activeLocale], key) ??
    resolvePath(translations[DEFAULT_LOCALE], key) ??
    resolvePath(translations.en, key) ??
    key;

  if (Array.isArray(value)) {
    return value;
  }

  return typeof value === "string" ? interpolate(value, params) : value;
}

export function useI18n() {
  const locale = useStore((state) => state.locale ?? DEFAULT_LOCALE);
  const setLanguage = useStore((state) => state.setLanguage);

  return useMemo(
    () => ({
      locale,
      setLanguage,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale, setLanguage]
  );
}

