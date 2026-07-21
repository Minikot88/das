import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import CommandPaletteModal from "@/components/bi/CommandPaletteModal";
import DatasetExplorerModal from "@modules/datasets/components/DatasetExplorerModal";
import { TEMPLATE_GALLERY_CATALOG } from "@/data/templateGalleryCatalog";
import useNavigationControls from "@shared/hooks/useNavigationControls";
import {
  getActiveDashboard as getStoredActiveDashboard,
  getActiveProject as getStoredActiveProject,
  setActiveProject as setStoredActiveProject,
} from "@/services/projectStorage";
import { createBuilderContextForDashboard } from "@/utils/dashboardWorkspace";
import { getStorageHealth, subscribeStorageHealth } from "@/utils/storage";

const RIBBON_TABS = [
  { id: "home", label: "หน้าหลัก", routes: ["/", "/home"] },
  { id: "dashboard", label: "แดชบอร์ด", routes: ["/dashboard"] },
  { id: "chart", label: "สร้างกราฟ", routes: ["/dashboard-v2"] },
  { id: "data", label: "ข้อมูล", routes: ["/datasets", "/connections"] },
  { id: "tools", label: "เครื่องมือ", routes: ["/builder", "/dashboard-legacy"] },
  { id: "settings", label: "ตั้งค่า", routes: ["/settings"] },
];

const RIBBON_GROUPS = {
  home: [
    {
      title: "พื้นที่ทำงาน",
      items: [
        { label: "โปรเจกต์ใหม่", icon: "newProject", tone: "primary", action: "new-project" },
        { label: "เปิดโปรเจกต์", icon: "folder", route: "/dashboard" },
        { label: "ล่าสุด", icon: "clock", route: "/" },
      ],
    },
    {
      title: "สร้าง",
      items: [
        { label: "แดชบอร์ด", icon: "dashboard", route: "/dashboard" },
        { label: "ชุดข้อมูล", icon: "dataset", route: "/datasets" },
        { label: "เทมเพลต", icon: "template", route: "/builder" },
      ],
    },
    {
      title: "นำเข้า",
      items: [
        { label: "นำเข้า CSV", icon: "csv" },
        { label: "Google Sheet", icon: "sheet" },
        { label: "ไฟล์ Excel", icon: "excel" },
      ],
    },
    {
      title: "แชร์และส่งออก",
      items: [
        { label: "ส่งออก PDF", icon: "pdf" },
        { label: "ส่งออกรูปภาพ", icon: "image" },
        { label: "แชร์", icon: "share" },
      ],
    },
    {
      title: "เครื่องมือ",
      items: [
        { label: "รีเฟรชข้อมูล", icon: "refresh" },
        { label: "จัดการผู้ใช้", icon: "users" },
        { label: "สิทธิ์การใช้งาน", icon: "shield" },
      ],
    },
    {
      title: "ช่วยเหลือ",
      items: [
        { label: "ช่วยเหลือ", icon: "help" },
        { label: "สนับสนุน", icon: "support" },
      ],
    },
  ],
  dashboard: [
    {
      title: "การทำงานแดชบอร์ด",
      items: [
        { label: "สร้างแดชบอร์ด", icon: "dashboard", route: "/dashboard", tone: "primary" },
        { label: "บันทึก", icon: "save" },
        { label: "บันทึกเป็น", icon: "copy" },
        { label: "เผยแพร่", icon: "publish" },
        { label: "แชร์", icon: "share" },
      ],
    },
    {
      title: "กราฟ",
      items: [
        { label: "กราฟแท่ง", icon: "bar", route: "/dashboard-v2" },
        { label: "กราฟเส้น", icon: "line", route: "/dashboard-v2" },
        { label: "กราฟวงกลม", icon: "pie", route: "/dashboard-v2" },
        { label: "กราฟพื้นที่", icon: "area", route: "/dashboard-v2" },
        { label: "การ์ด KPI", icon: "kpi", route: "/dashboard-v2" },
        { label: "ตาราง", icon: "table", route: "/dashboard-v2" },
      ],
    },
    {
      title: "ส่งออก",
      items: [
        { label: "PDF", icon: "pdf" },
        { label: "PNG", icon: "image" },
        { label: "Excel", icon: "excel" },
      ],
    },
  ],
  data: [
    {
      title: "นำเข้า",
      items: [
        { label: "CSV", icon: "csv" },
        { label: "Excel", icon: "excel" },
        { label: "Google Sheet", icon: "sheet" },
        { label: "API", icon: "api" },
      ],
    },
    {
      title: "แปลงข้อมูล",
      items: [
        { label: "กรอง", icon: "filter" },
        { label: "เรียงลำดับ", icon: "sort" },
        { label: "รวมข้อมูล", icon: "merge" },
        { label: "ล้างข้อมูล", icon: "clean" },
      ],
    },
    {
      title: "รีเฟรช",
      items: [
        { label: "รีเฟรชข้อมูล", icon: "refresh" },
        { label: "ตั้งเวลารีเฟรช", icon: "clock" },
      ],
    },
  ],
  insert: [
    {
      title: "วิดเจ็ต",
      items: [
        { label: "KPI", icon: "kpi" },
        { label: "กราฟ", icon: "bar" },
        { label: "ตาราง", icon: "table" },
        { label: "ข้อความ", icon: "text" },
        { label: "รูปภาพ", icon: "image" },
      ],
    },
    {
      title: "เลย์เอาต์",
      items: [
        { label: "1 คอลัมน์", icon: "oneCol" },
        { label: "2 คอลัมน์", icon: "twoCol" },
        { label: "3 คอลัมน์", icon: "threeCol" },
        { label: "กริด", icon: "grid" },
      ],
    },
  ],
  automation: [
    {
      title: "เวิร์กโฟลว์",
      items: [
        { label: "กำหนดเวลา", icon: "clock" },
        { label: "การแจ้งเตือน", icon: "bell" },
        { label: "Webhook", icon: "api" },
        { label: "ทริกเกอร์", icon: "bolt" },
      ],
    },
  ],
  view: [
    {
      title: "ตัวอย่าง",
      items: [
        { label: "เดสก์ท็อป", icon: "desktop" },
        { label: "แท็บเล็ต", icon: "tablet" },
        { label: "มือถือ", icon: "mobile" },
      ],
    },
    {
      title: "ธีม",
      items: [
        { label: "สว่าง", icon: "sun" },
        { label: "มืด", icon: "moon" },
      ],
    },
    {
      title: "ซูม",
      items: [
        { label: "50%", icon: "zoomOut" },
        { label: "75%", icon: "zoom" },
        { label: "100%", icon: "zoomIn" },
      ],
    },
  ],
  admin: [
    {
      title: "ผู้ใช้",
      items: [
        { label: "ผู้ใช้", icon: "users" },
        { label: "บทบาท", icon: "roles" },
        { label: "สิทธิ์การใช้งาน", icon: "shield" },
      ],
    },
    {
      title: "พื้นที่ทำงาน",
      items: [
        { label: "ทีม", icon: "team" },
        { label: "การชำระเงิน", icon: "billing" },
        { label: "บันทึกระบบ", icon: "logs" },
      ],
    },
  ],
  settings: [
    {
      title: "แอปพลิเคชัน",
      items: [
        { label: "ทั่วไป", icon: "settings", route: "/settings" },
        { label: "ความปลอดภัย", icon: "shield", route: "/settings" },
        { label: "การเชื่อมต่อ", icon: "api", route: "/settings" },
        { label: "สำรองข้อมูล", icon: "backup", route: "/settings" },
      ],
    },
  ],
};

const MINI_RIBBON_TABS = [
  { id: "home", label: "หน้าหลัก", route: "/home", routes: ["/", "/home"] },
  { id: "dashboard", label: "แดชบอร์ด", route: "/dashboard", routes: ["/dashboard"] },
  { id: "chart", label: "สร้างกราฟ", route: "/dashboard-v2", routes: ["/dashboard-v2"] },
  { id: "data", label: "ข้อมูล", route: "/datasets", routes: ["/datasets", "/connections"] },
  { id: "tools", label: "เครื่องมือ", routes: ["/builder", "/dashboard-legacy"] },
  { id: "settings", label: "ตั้งค่า", route: "/settings", routes: ["/settings"] },
];

const PAGE_NAV_ITEMS = [
  { id: "home", label: "หน้าหลัก", route: "/home", keywords: "home หน้าหลัก workspace hub" },
  { id: "dashboard", label: "แดชบอร์ด", route: "/dashboard", keywords: "dashboard canvas builder ตัวจัดวางแดชบอร์ด" },
  { id: "chart", label: "สร้างกราฟ", route: "/dashboard-v2", keywords: "chart กราฟ สร้างกราฟ ตัวสร้างกราฟ" },
  { id: "datasets", label: "ชุดข้อมูล", route: "/datasets", keywords: "data dataset datasets ข้อมูล ชุดข้อมูล" },
  { id: "tools", label: "เครื่องมือ", route: null, keywords: "tools เครื่องมือ legacy builder dashboard legacy" },
  { id: "settings", label: "ตั้งค่า", route: "/settings", keywords: "settings ตั้งค่า" },
];

const TOOL_NAV_ITEMS = [
  {
    id: "tool-chart",
    label: "ตัวสร้างกราฟ",
    description: "ออกแบบกราฟและบันทึกเป็นสินทรัพย์กราฟ",
    route: "/dashboard-v2",
    keywords: "chart designer กราฟ ตัวสร้างกราฟ",
  },
  {
    id: "dashboard",
    label: "ตัวจัดวางแดชบอร์ด",
    description: "จัดวางวิดเจ็ตและกราฟบนแดชบอร์ด",
    route: "/dashboard",
    keywords: "dashboard canvas builder ตัวจัดวางแดชบอร์ด",
  },
  {
    id: "builder",
    label: "เครื่องมือเดิม",
    description: "สำหรับระบบเดิม",
    route: "/builder",
    keywords: "builder legacy เครื่องมือเดิม",
  },
  {
    id: "legacy",
    label: "แดชบอร์ดเดิม",
    description: "สำหรับดูหน้าเดิม",
    route: "/dashboard-legacy",
    keywords: "dashboard legacy แดชบอร์ดเดิม",
  },
  {
    id: "connections",
    label: "เชื่อมต่อฐานข้อมูล",
    description: "ตั้งค่า connection profile แบบ demo",
    route: "/connections",
    keywords: "database connection postgresql mysql dbeaver เชื่อมต่อฐานข้อมูล",
  },
  {
    id: "tool-export",
    label: "ส่งออก / รายงาน",
    description: "กำลังเตรียมสำหรับเวอร์ชันถัดไป",
    disabled: true,
  },
  {
    id: "tool-settings",
    label: "ตั้งค่าขั้นสูง",
    description: "ไปยังการตั้งค่าระบบ",
    route: "/settings",
    keywords: "advanced settings ตั้งค่า",
  },
];

function getActiveRibbonTab(pathname) {
  return MINI_RIBBON_TABS.find((tab) => tab.routes.includes(pathname))?.id ?? "home";
}

function getCurrentPageMeta(pathname) {
  if (pathname === "/" || pathname === "/home") return PAGE_NAV_ITEMS[0];
  return (
    PAGE_NAV_ITEMS.find((item) => item.route === pathname) ??
    TOOL_NAV_ITEMS.find((item) => item.route === pathname) ??
    { id: "unknown", label: "หน้าหลัก", route: "/home" }
  );
}

const MINI_RIBBON_GROUPS = {
  home: [
    {
      title: "พื้นที่ทำงาน",
      items: [
        { label: "โปรเจกต์ใหม่", icon: "newProject", tone: "primary", action: "new-project" },
        { label: "เปิดโปรเจกต์", icon: "folder", route: "/dashboard" },
        { label: "ล่าสุด", icon: "clock", route: "/" },
      ],
    },
    {
      title: "สร้าง",
      items: [
        { label: "แดชบอร์ด", icon: "dashboard", route: "/dashboard" },
        { label: "สร้างกราฟ", icon: "bar", route: "/dashboard-v2" },
        { label: "ชุดข้อมูล", icon: "dataset", route: "/datasets" },
        { label: "เทมเพลต", icon: "template", action: "templates" },
      ],
    },
  ],
  dashboard: [
    {
      title: "เพิ่มวิดเจ็ต",
      items: [
        { label: "เพิ่มกราฟ", title: "ไปที่ตัวสร้างกราฟเพื่อสร้างกราฟใหม่", icon: "bar", tone: "primary", action: "dashboard:add-chart" },
        { label: "เพิ่ม KPI", icon: "kpi", action: "dashboard:add-kpi" },
        { label: "เพิ่มตาราง", icon: "table", action: "dashboard:add-table" },
        { label: "เพิ่มข้อความ", icon: "text", action: "dashboard:add-text" },
        { label: "เพิ่มรูปภาพ", icon: "image", action: "dashboard:add-image" },
        { label: "เพิ่มตัวกรอง", icon: "filter", action: "dashboard:add-filter" },
      ],
    },
    {
      title: "การทำงาน",
      items: [
        { label: "เลือกเทมเพลต", icon: "template", action: "dashboard:templates" },
        { label: "จัดเรียง", title: "จัดเรียงวิดเจ็ตบน Canvas อัตโนมัติ", icon: "grid", action: "dashboard:auto-arrange" },
        { label: "บันทึก", icon: "save", action: "dashboard:save" },
        { label: "พรีวิว", icon: "desktop", action: "dashboard:preview" },
        { label: "แชร์", icon: "share", action: "dashboard:share" },
        { label: "ส่งออก", icon: "pdf", action: "dashboard:export" },
      ],
    },
  ],
  chart: [
    {
      title: "ข้อมูลและเทมเพลต",
      items: [
        { label: "Templates", icon: "template", tone: "primary", action: "chart:templates" },
        { label: "SQL", icon: "api", action: "chart:sql" },
        { label: "Presets", icon: "settings", action: "chart:presets" },
      ],
    },
    {
      title: "ประเภทกราฟ",
      items: [
        { label: "Bar", icon: "bar", action: "chart:select", chartType: "bar" },
        { label: "Line", icon: "line", action: "chart:select", chartType: "line" },
        { label: "Pie", icon: "pie", action: "chart:select", chartType: "pie" },
        { label: "KPI", icon: "kpi", action: "chart:select", chartType: "kpi-card" },
        { label: "Table", icon: "table", action: "chart:select", chartType: "table" },
      ],
    },
  ],
  data: [
    {
      title: "นำเข้า",
      items: [
        { label: "นำเข้าข้อมูล", icon: "csv", route: "/datasets", tone: "primary" },
        { label: "เชื่อมต่อ", title: "เชื่อมต่อฐานข้อมูล", icon: "api", route: "/connections" },
        { label: "รีเฟรช", icon: "refresh", action: "coming-soon", noticeTitle: "รีเฟรชข้อมูล", noticeMessage: "ตอนนี้ใช้ข้อมูลเดโมในเครื่อง ยังไม่มี backend สำหรับรีเฟรชข้อมูลจริง" },
        { label: "ค้นหา", icon: "filter", action: "datasets:focus-search" },
      ],
    },
    {
      title: "ตรวจสอบ",
      items: [
        { label: "Schema", title: "ตรวจ Schema", icon: "dataset", action: "dataset-explorer" },
        { label: "ดูตัวอย่าง", icon: "table", action: "dataset-explorer" },
        { label: "CSV", title: "ส่งออก CSV", icon: "excel", action: "coming-soon", noticeTitle: "ส่งออก CSV", noticeMessage: "ส่งออกข้อมูลระดับชุดข้อมูลจะพร้อมเมื่อเชื่อม backend แล้ว" },
      ],
    },
  ],
  tools: [
    {
      title: "เครื่องมือ",
      items: [
        { label: "ตัวสร้างกราฟ", icon: "bar", route: "/dashboard-v2", tone: "primary" },
        { label: "แดชบอร์ด", title: "ตัวจัดวางแดชบอร์ด", icon: "dashboard", route: "/dashboard" },
        { label: "เชื่อมต่อ", title: "เชื่อมต่อฐานข้อมูล", icon: "api", route: "/connections" },
        { label: "เดิม", title: "เครื่องมือเดิม", icon: "settings", route: "/builder" },
        { label: "เดิม", title: "แดชบอร์ดเดิม", icon: "dashboard", route: "/dashboard-legacy" },
        { label: "ส่งออก", title: "ส่งออก / รายงาน", icon: "pdf", action: "coming-soon", noticeTitle: "ส่งออก / รายงาน", noticeMessage: "ศูนย์ส่งออกและรายงานจะเปิดใช้ในเวอร์ชันถัดไป" },
        { label: "คำสั่งลัด", icon: "help", action: "command-palette" },
      ],
    },
  ],
  settings: [
    {
      title: "ตั้งค่า",
      items: [
        { label: "พื้นที่งาน", title: "Workspace", icon: "team", route: "/settings" },
        { label: "ธีม", title: "Appearance", icon: "sun", route: "/settings" },
        { label: "ข้อมูล", title: "Data", icon: "dataset", route: "/settings" },
        { label: "ส่งออก", title: "Export", icon: "pdf", route: "/settings" },
        { label: "ความปลอดภัย", title: "Security", icon: "shield", route: "/settings" },
        { label: "ขั้นสูง", title: "Advanced", icon: "settings", route: "/settings" },
        { label: "รีเซ็ตเดโม", title: "Demo Reset", icon: "refresh", action: "coming-soon", noticeTitle: "รีเซ็ตข้อมูลเดโม", noticeMessage: "ยังไม่ได้เปิดคำสั่งล้างข้อมูลเดโมจาก global ribbon เพื่อป้องกันการลบข้อมูลโดยไม่ตั้งใจ" },
      ],
    },
  ],
};

function ThemeIcon({ theme }) {
  if (theme === "dark") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3.5V1.75M10 18.25V16.5M4.93 4.93L3.7 3.7M16.3 16.3L15.07 15.07M3.5 10H1.75M18.25 10H16.5M4.93 15.07L3.7 16.3M16.3 3.7L15.07 4.93" stroke="currentColor" strokeWidth="1.35" strokeLinecap="square" />
        <circle cx="10" cy="10" r="3.5" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M13.75 2.5C11.37 2.76 9.5 4.77 9.5 7.25C9.5 9.9 11.65 12.05 14.3 12.05C15.15 12.05 15.95 11.83 16.64 11.45C15.97 14.45 13.29 16.7 10.08 16.7C6.37 16.7 3.37 13.7 3.37 9.99C3.37 6.79 5.61 4.11 8.61 3.43C8.24 4.12 8.02 4.92 8.02 5.77C8.02 8.42 10.17 10.57 12.82 10.57C13.15 10.57 13.46 10.54 13.75 10.47" fill="currentColor" />
    </svg>
  );
}

function RibbonIcon({ name }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 1.75,
    viewBox: "0 0 24 24",
    "aria-hidden": "true",
  };

  const paths = {
    newProject: <path d="M12 5v14M5 12h14M4 5h5l2 2h9v12H4V5Z" />,
    folder: <path d="M4 6h6l2 2h8v10.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5V6Z" />,
    clock: <path d="M12 6v6l4 2m5-2a9 9 0 1 1-2.6-6.4" />,
    dashboard: <path d="M4 5h7v7H4V5Zm9 0h7v4h-7V5ZM4 14h7v5H4v-5Zm9-3h7v8h-7v-8Z" />,
    dataset: <path d="M5 7c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Zm0 0v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />,
    template: <path d="M5 4h6v6H5V4Zm8 0h6v6h-6V4ZM5 14h6v6H5v-6Zm8 0h6v6h-6v-6Z" />,
    csv: <path d="M7 3h7l4 4v14H7V3Zm7 0v5h5M9 13h6M9 17h4" />,
    excel: <path d="M5 4h14v16H5V4Zm4 4 6 8m0-8-6 8M5 9h14M5 15h14" />,
    sheet: <path d="M5 4h14v16H5V4Zm0 5h14M5 14h14M10 4v16M15 4v16" />,
    pdf: <path d="M7 3h7l4 4v14H7V3Zm7 0v5h5M9 14h2a2 2 0 0 0 0-4H9v7m6-7h2v7h-2" />,
    image: <path d="M5 5h14v14H5V5Zm3 10 3-3 2 2 2-3 3 4M9 9h.01" />,
    share: <path d="M18 8a3 3 0 1 0-2.8-4.1M6 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.7 15.6l6.6-3.2M8.7 18.4l6.6-3.2" />,
    refresh: <path d="M20 12a8 8 0 0 1-13.7 5.7M4 12A8 8 0 0 1 17.7 6.3M17 3v4h-4M7 21v-4h4" />,
    users: <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20m9-12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4 6a3 3 0 0 0 0-6m1 12v-1a3 3 0 0 0-2-2.8" />,
    shield: <path d="M12 3 19 6v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3Z" />,
    help: <path d="M9.1 9a3 3 0 1 1 4.8 2.4c-.9.6-1.4 1.1-1.4 2.1M12 18h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
    support: <path d="M5 13v-2a7 7 0 0 1 14 0v2M5 13h3v5H5v-5Zm11 0h3v5h-3v-5Zm0 5c0 1.5-1.2 2-3 2h-2" />,
    save: <path d="M5 4h12l2 2v14H5V4Zm3 0v6h8V4M8 20v-6h8v6" />,
    copy: <path d="M8 8h11v11H8V8ZM5 16H4V4h12v1" />,
    publish: <path d="M12 16V4m0 0 4 4m-4-4-4 4M5 14v5h14v-5" />,
    bar: <path d="M5 19V5m0 14h15M9 16v-5m4 5V8m4 8v-3" />,
    line: <path d="M4 17 9 11l4 3 7-8M4 20h16" />,
    pie: <path d="M12 3v9h9A9 9 0 1 1 12 3Zm3 0a9 9 0 0 1 6 6h-6V3Z" />,
    area: <path d="M4 18 9 9l4 4 4-7 3 12H4Z" />,
    kpi: <path d="M5 5h14v14H5V5Zm3 10 2.5-3 2 2 3.5-5" />,
    table: <path d="M4 5h16v14H4V5Zm0 5h16M4 14h16M9 5v14M15 5v14" />,
    api: <path d="M8 8 4 12l4 4m8-8 4 4-4 4M14 4l-4 16" />,
    filter: <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />,
    sort: <path d="M7 4v16m0 0-3-3m3 3 3-3m10-13H12m6 5h-6m4 5h-4" />,
    merge: <path d="M6 4v5a5 5 0 0 0 5 5h7m0 0-3-3m3 3-3 3M18 4v5a5 5 0 0 1-5 5" />,
    clean: <path d="M5 19h14M8 17l8-8-4-4-8 8 4 4Zm7-7 4 4" />,
    text: <path d="M5 6h14M12 6v12M9 18h6" />,
    oneCol: <path d="M7 4h10v16H7V4Z" />,
    twoCol: <path d="M4 4h7v16H4V4Zm9 0h7v16h-7V4Z" />,
    threeCol: <path d="M3 4h5v16H3V4Zm6.5 0h5v16h-5V4ZM16 4h5v16h-5V4Z" />,
    grid: <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />,
    bell: <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Zm-8 4h4" />,
    bolt: <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" />,
    desktop: <path d="M4 5h16v11H4V5Zm5 15h6m-3-4v4" />,
    tablet: <path d="M7 3h10v18H7V3Zm5 15h.01" />,
    mobile: <path d="M9 3h6v18H9V3Zm3 15h.01" />,
    sun: <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />,
    moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" />,
    zoomOut: <path d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-3 6h6m2 4 4 4" />,
    zoom: <path d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm2 6H9m2-2v4m5 2 4 4" />,
    zoomIn: <path d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm2 6H9m2-2v4m5 2 4 4" />,
    roles: <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0M17 4l2 2 3-3" />,
    team: <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a5 5 0 0 1 10 0m-2-2a5 5 0 0 1 10 0" />,
    billing: <path d="M4 6h16v12H4V6Zm0 4h16M8 15h4" />,
    logs: <path d="M6 4h12v16H6V4Zm3 5h6m-6 4h6m-6 4h4" />,
    settings: <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3a7.7 7.7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8.8 8.8 0 0 0-1.7-1L15.5 2h-4l-.3 3a8.8 8.8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5A7.7 7.7 0 0 0 7 12c0 .3 0 .7.1 1l-2 1.5 2 3.5 2.4-1c.5.4 1.1.7 1.7 1l.3 3h4l.3-3c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" />,
    backup: <path d="M6 19h12a4 4 0 0 0 0-8 6 6 0 0 0-11.3-2A5 5 0 0 0 6 19Zm6-9v5m0 0-2-2m2 2 2-2" />,
  };

  return <svg {...common}>{paths[name] ?? paths.dashboard}</svg>;
}

export default function AppHeader() {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const projects = useStore((s) => s.projects);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const activeSheetId = useStore((s) => s.activeSheetId);
  const activeDashboardId = useStore((s) => s.activeDashboardId);
  const setActiveProject = useCallback((projectId) => {
    setStoredActiveProject(projectId);
  }, []);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [datasetExplorerOpen, setDatasetExplorerOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [storageHealth, setStorageHealth] = useState(() => getStorageHealth());
  const [noticeDialog, setNoticeDialog] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigationControls();
  const routeRibbonTab = getActiveRibbonTab(location.pathname);
  const [manualRibbonTab, setManualRibbonTab] = useState(null);
  const activeRibbonTab = manualRibbonTab ?? routeRibbonTab;
  const ribbonGroups = MINI_RIBBON_GROUPS[activeRibbonTab] ?? MINI_RIBBON_GROUPS.home;
  const currentPage = getCurrentPageMeta(location.pathname);
  const showRibbon = true;

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null,
    [projects, activeProjectId]
  );

  const activeSheet = useMemo(
    () => activeProject?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets?.[0] ?? null,
    [activeProject, activeSheetId]
  );

  const activeDashboard = useMemo(
    () =>
      activeSheet?.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ??
      activeSheet?.dashboards?.[0] ??
      null,
    [activeSheet, activeDashboardId]
  );

  const quickBuilderContext = useMemo(
    () =>
      createBuilderContextForDashboard({
        projectId: activeProject?.id,
        sheetId: activeSheet?.id,
        dashboardId: activeDashboard?.id,
        returnTo: "/dashboard",
        source: "command-palette",
      }),
    [activeDashboard?.id, activeProject?.id, activeSheet?.id]
  );

  const showNotice = useCallback((title, message) => {
    setNoticeDialog({
      title: title || "ยังไม่พร้อมใช้งาน",
      message: message || "คำสั่งนี้กำลังเตรียมสำหรับเวอร์ชันถัดไป",
    });
  }, []);

  const commandActions = useMemo(
    () => [
      {
        id: "go-home",
        label: "หน้าหลัก",
        detail: "เปิดหน้าหลักของพื้นที่ทำงาน",
        group: "การนำทาง",
        keywords: "home หน้าหลัก workspace hub",
        shortcut: "Ctrl",
        onActivate: () => navigate("/home"),
      },
      {
        id: "go-dashboard",
        label: "แดชบอร์ด",
        detail: "เปิดตัวจัดวางแดชบอร์ด",
        group: "การนำทาง",
        keywords: "dashboard canvas builder ตัวจัดวางแดชบอร์ด",
        shortcut: "D",
        onActivate: () => navigate("/dashboard"),
      },
      {
        id: "go-chart-designer",
        label: "สร้างกราฟ",
        detail: "เปิดตัวสร้างกราฟ",
        group: "การนำทาง",
        keywords: "chart กราฟ สร้างกราฟ ตัวสร้างกราฟ",
        shortcut: "C",
        onActivate: () => navigate("/dashboard-v2"),
      },
      {
        id: "go-datasets",
        label: "ชุดข้อมูล",
        detail: "เปิดหน้าจัดการชุดข้อมูล",
        group: "การนำทาง",
        keywords: "data dataset datasets ข้อมูล ชุดข้อมูล",
        shortcut: "Data",
        onActivate: () => navigate("/datasets"),
      },
      {
        id: "go-connections",
        label: "เชื่อมต่อฐานข้อมูล",
        detail: "เปิดหน้าตั้งค่า database connection profile",
        group: "ข้อมูล",
        keywords: "database connection postgresql mysql mariadb sql server dbeaver เชื่อมต่อฐานข้อมูล",
        shortcut: "DB",
        onActivate: () => navigate("/connections"),
      },
      {
        id: "go-settings",
        label: "ตั้งค่า",
        detail: "เปิดหน้าตั้งค่าระบบ",
        group: "การนำทาง",
        keywords: "settings ตั้งค่า",
        shortcut: "S",
        onActivate: () => navigate("/settings"),
      },
      {
        id: "go-legacy-dashboard",
        label: "แดชบอร์ดเดิม",
        detail: "เปิดแดชบอร์ดเดิม",
        group: "การนำทาง",
        keywords: "legacy แดชบอร์ดเดิม",
        shortcut: "L",
        onActivate: () => navigate("/dashboard-legacy"),
      },
      {
        id: "go-builder",
        label: "เครื่องมือเดิม",
        detail: "เปิดเครื่องมือเดิม",
        group: "การนำทาง",
        keywords: "builder เครื่องมือเดิม legacy builder",
        shortcut: "B",
        onActivate: () => navigate("/builder"),
      },
      {
        id: "go-dashboard-canvas",
        label: "ตัวจัดวางแดชบอร์ด",
        detail: "จัดวางวิดเจ็ตและกราฟบนแดชบอร์ด",
        group: "เครื่องมือ",
        keywords: "dashboard canvas builder ตัวจัดวางแดชบอร์ด",
        onActivate: () => navigate("/dashboard"),
      },
      {
        id: "go-chart-tool",
        label: "ตัวสร้างกราฟ",
        detail: "สร้างกราฟ reusable asset",
        group: "เครื่องมือ",
        keywords: "chart designer chart builder ตัวสร้างกราฟ สร้างกราฟ",
        onActivate: () => navigate("/dashboard-v2"),
      },
      {
        id: "import-data",
        label: "นำเข้าข้อมูล",
        detail: "เปิดหน้าชุดข้อมูลเพื่อเริ่มนำเข้าข้อมูล",
        group: "ข้อมูล",
        keywords: "import data csv excel google sheet นำเข้า ข้อมูล",
        onActivate: () => navigate("/datasets"),
      },
      {
        id: "open-sql",
        label: "SQL",
        detail: "เปิดตัวสร้างกราฟสำหรับโหมด SQL demo",
        group: "ตัวสร้างกราฟ",
        keywords: "sql query demo",
        onActivate: () => navigate("/dashboard-v2"),
      },
      {
        id: "global-export",
        label: "Export",
        detail: "ศูนย์ส่งออกและรายงานยังไม่พร้อมใช้งาน",
        group: "คำสั่ง",
        keywords: "export ส่งออก report รายงาน",
        onActivate: () => showNotice("Export", "ใช้เมนูส่งออกในตัวจัดวางแดชบอร์ดหรือตัวสร้างกราฟได้แล้ว ส่วนศูนย์ส่งออกรวมจะเปิดในเวอร์ชันถัดไป"),
      },
      {
        id: "global-share",
        label: "Share",
        detail: "เปิดหน้าที่ต้องการแชร์ก่อนใช้งาน",
        group: "คำสั่ง",
        keywords: "share แชร์ link",
        onActivate: () => showNotice("Share", "เปิดตัวจัดวางแดชบอร์ดหรือตัวสร้างกราฟ แล้วใช้ปุ่มแชร์ใน ribbon ของหน้านั้น"),
      },
      {
        id: "global-preview",
        label: "Preview",
        detail: "เปิดหน้าที่ต้องการพรีวิวก่อนใช้งาน",
        group: "คำสั่ง",
        keywords: "preview พรีวิว นำเสนอ presentation",
        onActivate: () => showNotice("Preview", "เปิดตัวจัดวางแดชบอร์ดหรือตัวสร้างกราฟ แล้วใช้ปุ่มพรีวิวใน ribbon ของหน้านั้น"),
      },
      {
        id: "open-dataset-explorer",
        label: "เปิดตัวสำรวจชุดข้อมูล",
        detail: "ตรวจฟิลด์และข้อมูลตัวอย่าง",
        group: "ข้อมูล",
        shortcut: "Ctrl+D",
        onActivate: null,
      },
      ...TEMPLATE_GALLERY_CATALOG.map((template) => ({
        id: `template-${template.id}`,
        label: template.title,
        detail: `${template.category} - ${template.hint}`,
        group: "คลังเทมเพลต",
        onActivate: () => {
          if (quickBuilderContext) {
            navigate("/builder", {
              state: {
                builderContext: {
                  ...quickBuilderContext,
                  prefillTemplateId: template.prefillTemplateId,
                },
              },
            });
          } else {
            navigate("/builder");
          }
        },
      })),
    ],
    [navigate, quickBuilderContext, showNotice]
  );

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false);
  }, []);

  const openDatasetExplorer = useCallback(() => {
    closeCommandPalette();
    setDatasetExplorerOpen(true);
  }, [closeCommandPalette]);

  const closeNavigationOverlays = useCallback(() => {
    setCommandPaletteOpen(false);
    setDatasetExplorerOpen(false);
    setMobileNavOpen(false);
    setToolsMenuOpen(false);
    setNoticeDialog(null);
  }, []);

  const resolveNavigationRoute = useCallback((route) => {
    if (route !== "/dashboard-v2" || location.pathname !== "/dashboard") return route;
    const project = getStoredActiveProject();
    const dashboard = getStoredActiveDashboard();
    const search = new URLSearchParams({
      from: "dashboard",
      mode: "create",
    });
    if (project?.id) search.set("projectId", project.id);
    if (dashboard?.id) search.set("dashboardId", dashboard.id);
    return `/dashboard-v2?${search.toString()}`;
  }, [location.pathname]);

  const saveDashboardBeforeChartDesigner = useCallback((route) => {
    if (route !== "/dashboard-v2" || location.pathname !== "/dashboard") return;
    window.dispatchEvent(
      new CustomEvent("mini-bi:ribbon-command", {
        detail: {
          scope: "dashboard",
          command: "save",
        },
      })
    );
  }, [location.pathname]);

  const navigateToPage = useCallback((route) => {
    const resolvedRoute = resolveNavigationRoute(route);
    const resolvedUrl = new URL(resolvedRoute, window.location.origin);
    const currentPath = location.pathname === "/" ? "/home" : location.pathname;
    const nextPath = resolvedUrl.pathname === "/" ? "/home" : resolvedUrl.pathname;

    closeNavigationOverlays();
    setManualRibbonTab(null);
    if (nextPath === currentPath && resolvedUrl.search === location.search) {
      showNotice("อยู่ที่หน้านี้แล้ว", "คุณอยู่ในหน้าที่เลือกอยู่แล้ว");
      return;
    }
    saveDashboardBeforeChartDesigner(route);
    navigate(resolvedRoute);
  }, [closeNavigationOverlays, location.pathname, location.search, navigate, resolveNavigationRoute, saveDashboardBeforeChartDesigner, showNotice]);

  const handlePageBack = useCallback(() => {
    closeNavigationOverlays();
    navigation.goBack();
  }, [closeNavigationOverlays, navigation]);

  const handlePageForward = useCallback(() => {
    closeNavigationOverlays();
    navigation.goForward();
  }, [closeNavigationOverlays, navigation]);

  useEffect(() => subscribeStorageHealth(setStorageHealth), []);

  useEffect(() => {
    setManualRibbonTab(null);
    closeNavigationOverlays();
  }, [location.pathname, closeNavigationOverlays]);

  useEffect(() => {
    if (!toolsMenuOpen) return undefined;

    function handleToolsMenuKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setToolsMenuOpen(false);
        setManualRibbonTab(null);
      }
    }

    document.addEventListener("keydown", handleToolsMenuKeyDown);
    return () => {
      document.removeEventListener("keydown", handleToolsMenuKeyDown);
    };
  }, [toolsMenuOpen]);

  useEffect(() => {
    function handleShortcut(event) {
      const target = event.target;
      const isInputElement =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !isInputElement) {
        event.preventDefault();
        openCommandPalette();
      }
    }

    document.addEventListener("keydown", handleShortcut);
    return () => {
      document.removeEventListener("keydown", handleShortcut);
    };
  }, [openCommandPalette]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function handleNewProject() {
    const createButton = document.getElementById("create-project-btn");
    if (createButton) {
      createButton.click();
      return;
    }
    navigateToPage("/home");
  }

  function dispatchRibbonEvent(scope, command, payload = {}) {
    window.dispatchEvent(
      new CustomEvent("mini-bi:ribbon-command", {
        detail: {
          scope,
          command,
          ...payload,
        },
      })
    );
  }

  function handleScopedRibbonCommand(item, scope, targetRoute) {
    if (location.pathname !== targetRoute) {
      navigateToPage(targetRoute);
      return;
    }

    dispatchRibbonEvent(scope, item.action.split(":")[1], {
      chartType: item.chartType,
    });
  }

  function handleRibbonCommand(item) {
    if (item.action === "new-project") {
      handleNewProject();
      return;
    }
    if (item.action === "templates") {
      setSearchValue("เทมเพลต");
      setCommandPaletteOpen(true);
      return;
    }
    if (item.action === "command-palette") {
      setSearchValue("");
      setCommandPaletteOpen(true);
      return;
    }
    if (item.action === "dataset-explorer") {
      setDatasetExplorerOpen(true);
      return;
    }
    if (item.action === "coming-soon") {
      showNotice(item.noticeTitle ?? item.label, item.noticeMessage);
      return;
    }
    if (item.action?.startsWith("dashboard:")) {
      handleScopedRibbonCommand(item, "dashboard", "/dashboard");
      return;
    }
    if (item.action?.startsWith("chart:")) {
      handleScopedRibbonCommand(item, "chart", "/dashboard-v2");
      return;
    }
    if (item.action?.startsWith("datasets:")) {
      handleScopedRibbonCommand(item, "datasets", "/datasets");
      return;
    }
    if (item.route) {
      navigateToPage(item.route);
    }
  }

  function handleToolMenuItem(item) {
    if (item.disabled) return;
    if (item.route) {
      navigateToPage(item.route);
    }
  }

  return (
    <>
      {!storageHealth.ok ? (
        <div className="storage-health-banner" role="alert">
          {storageHealth.message || "อาจไม่สามารถบันทึกการเปลี่ยนแปลงพื้นที่ทำงานได้"}
        </div>
      ) : null}

      <header className={`appbar mini-bi-appbar mini-bi-app-header mini-bi-header-shell${showRibbon ? "" : " is-ribbon-hidden"}`} role="banner">
        <div className="mini-bi-topbar">
          <div className="mini-bi-brand-cluster">
            <button type="button" className="appbar-logo mini-bi-logo" onClick={() => navigateToPage("/home")} aria-label="กลับหน้าหลัก" title="กลับหน้าหลัก">
              <span className="appbar-logo-mark mini-bi-logo-mark" aria-hidden="true">MB</span>
              <span className="appbar-logo-copy">
                <strong>Mini BI</strong>
                <span>พื้นที่ทำงาน 01</span>
              </span>
            </button>
            <select
              className="mini-bi-workspace-select"
              value={activeProjectId}
              onChange={(event) => setActiveProject(event.target.value)}
              aria-label="ตัวเลือกพื้นที่ทำงาน"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <div className="mini-bi-quick-access" aria-label="คำสั่งด่วน">
              <button
                type="button"
                title={navigation.canGoBack ? "ย้อนกลับ" : "อยู่ที่หน้าหลักแล้ว"}
                aria-label="ย้อนกลับ"
                onClick={handlePageBack}
                disabled={!navigation.canGoBack}
              >
                <span aria-hidden="true">←</span>
              </button>
              <button
                type="button"
                title={navigation.canGoForward ? "ไปข้างหน้า" : "ไม่มีหน้าถัดไป"}
                aria-label="ไปข้างหน้า"
                onClick={handlePageForward}
                disabled={!navigation.canGoForward}
              >
                <span aria-hidden="true">→</span>
              </button>
              <button type="button" title="หน้าหลัก" aria-label="หน้าหลัก" onClick={() => navigateToPage("/home")}>
                <span aria-hidden="true">⌂</span>
              </button>
            </div>
            <div className="mini-bi-page-breadcrumb" aria-label="ตำแหน่งปัจจุบัน">
              <span>Mini BI</span>
              <span aria-hidden="true">/</span>
              <strong>{currentPage.label}</strong>
            </div>
          </div>

          <div className="mini-bi-mobile-nav" aria-label="เมนูนำทางมือถือ">
            <button
              type="button"
              className="mini-bi-mobile-icon"
              onClick={handlePageBack}
              disabled={!navigation.canGoBack}
              aria-label="ย้อนกลับ"
              title={navigation.canGoBack ? "ย้อนกลับ" : "อยู่ที่หน้าหลักแล้ว"}
            >
              ←
            </button>
            <span className="mini-bi-mobile-title">{currentPage.label}</span>
            <button
              type="button"
              className="mini-bi-mobile-icon"
              onClick={() => setMobileNavOpen(true)}
              aria-label="เปิดเมนูนำทาง"
              title="เปิดเมนูนำทาง"
            >
              ☰
            </button>
          </div>

          <label className="appbar-search-wrap mini-bi-search">
            <span className="appbar-search-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                <path
                  d="M18 18L14.2 14.2M15.5 9.2a6.3 6.3 0 1 1-12.6 0 6.3 6.3 0 0 1 12.6 0Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="text"
              className="appbar-search"
              placeholder="ค้นหาแดชบอร์ด ชุดข้อมูล หรือโปรเจกต์..."
              aria-label="ค้นหา"
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                if (event.target.value.trim()) openCommandPalette();
              }}
              onFocus={openCommandPalette}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  openCommandPalette();
                }
              }}
            />
          </label>

          <div className="mini-bi-topbar-actions">
            <button type="button" className="mini-bi-icon-btn" onClick={openCommandPalette} aria-label="ช่วยเหลือ">
              <RibbonIcon name="help" />
            </button>
            <button type="button" className="mini-bi-icon-btn" aria-label="การแจ้งเตือน" title="การแจ้งเตือน ยังไม่พร้อมใช้งาน" disabled>
              <RibbonIcon name="bell" />
              <span className="mini-bi-notification-dot" />
            </button>
            <button
              type="button"
              className="mini-bi-icon-btn"
              onClick={toggleTheme}
              aria-label="สลับธีม"
              title={theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"}
            >
              <ThemeIcon theme={theme} />
            </button>
            {user ? (
              <button type="button" className="appbar-user mini-bi-user" onClick={handleLogout} title="ออกจากระบบ">
                <div className="avatar-circle">{user.name?.[0]?.toUpperCase() ?? "U"}</div>
              </button>
            ) : null}
            <button type="button" className="mini-bi-primary-cta" onClick={handleNewProject}>
              <span aria-hidden="true">+</span>
              <span>โปรเจกต์ใหม่</span>
            </button>
          </div>
        </div>

        <nav className="mini-bi-ribbon-tabs mini-bi-main-nav" aria-label="แท็บริบบอน">
          {MINI_RIBBON_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`mini-bi-ribbon-tab${tab.id === activeRibbonTab ? " is-active" : ""}`}
              onClick={() => {
                if (tab.id === "tools") {
                  setCommandPaletteOpen(false);
                  setDatasetExplorerOpen(false);
                  setMobileNavOpen(false);
                  setManualRibbonTab("tools");
                  setToolsMenuOpen(false);
                  return;
                }
                if (tab.route) {
                  navigateToPage(tab.route);
                  return;
                }
                setManualRibbonTab(tab.id);
              }}
              aria-pressed={tab.id === activeRibbonTab}
              aria-haspopup={tab.id === "tools" ? "menu" : undefined}
              aria-expanded={tab.id === "tools" ? toolsMenuOpen : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {toolsMenuOpen ? (
          <div
            className="mini-bi-tools-menu-backdrop"
            role="presentation"
            onClick={() => {
              setToolsMenuOpen(false);
              setManualRibbonTab(null);
            }}
          >
            <div
              className="mini-bi-tools-menu"
              role="menu"
              aria-label="เมนูเครื่องมือ"
              onClick={(event) => event.stopPropagation()}
            >
              {TOOL_NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={currentPage.id === item.id ? "is-active" : ""}
                  onClick={() => handleToolMenuItem(item)}
                  disabled={item.disabled}
                  aria-disabled={item.disabled || undefined}
                  title={item.disabled ? `${item.label} ยังไม่พร้อมใช้งาน` : item.label}
                >
                  <span>{item.label}</span>
                  <small>{item.description}</small>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showRibbon ? (
          <div className="mini-bi-ribbon-area mini-bi-ribbon" role="toolbar" aria-label={`${activeRibbonTab} คำสั่งริบบอน`}>
          {ribbonGroups.map((group) => (
            <section className="mini-bi-ribbon-group" key={group.title} aria-label={group.title}>
              <div className="mini-bi-ribbon-command-row">
                {group.items.map((item) => {
                  const isCommandAvailable = Boolean(item.route || item.action);
                  const commandTitle = item.title ?? item.label;
                  return (
                    <button
                      key={`${group.title}-${commandTitle}`}
                      type="button"
                      className={`mini-bi-ribbon-command${item.tone === "primary" ? " is-primary" : ""}`}
                      onClick={() => handleRibbonCommand(item)}
                      disabled={!isCommandAvailable}
                      aria-disabled={!isCommandAvailable}
                      aria-label={commandTitle}
                      title={isCommandAvailable ? commandTitle : `${commandTitle} ยังไม่พร้อมใช้งาน`}
                    >
                      <span className="mini-bi-ribbon-command-icon">
                        <RibbonIcon name={item.icon} />
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <span className="mini-bi-ribbon-group-title">{group.title}</span>
            </section>
          ))}
          </div>
        ) : null}
      </header>

      {mobileNavOpen ? (
        <div className="mini-bi-mobile-menu-overlay" role="presentation" onClick={() => setMobileNavOpen(false)}>
          <aside
            className="mini-bi-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="เมนูนำทาง"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mini-bi-mobile-menu-header">
              <strong>เมนูนำทาง</strong>
              <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="ปิดเมนูนำทาง" title="ปิดเมนูนำทาง">
                ×
              </button>
            </header>
            <div className="mini-bi-mobile-menu-list">
              {PAGE_NAV_ITEMS.map((item) => {
                const isToolsItem = item.id === "tools";
                const isActive = isToolsItem ? activeRibbonTab === "tools" : currentPage.id === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <button
                      type="button"
                      className={isActive ? "is-active" : ""}
                      onClick={() => {
                        if (item.route) {
                          navigateToPage(item.route);
                          return;
                        }
                        setManualRibbonTab("tools");
                      }}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.label}
                    </button>
                    {isToolsItem ? (
                      <div className="mini-bi-mobile-submenu" aria-label="เมนูย่อยเครื่องมือ">
                        {TOOL_NAV_ITEMS.map((toolItem) => (
                          <button
                            key={toolItem.id}
                            type="button"
                            className={currentPage.id === toolItem.id ? "is-active" : ""}
                            onClick={() => handleToolMenuItem(toolItem)}
                            disabled={toolItem.disabled}
                            title={toolItem.disabled ? `${toolItem.label} ยังไม่พร้อมใช้งาน` : toolItem.label}
                          >
                            <span>{toolItem.label}</span>
                            <small>{toolItem.description}</small>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </div>
          </aside>
        </div>
      ) : null}

      {noticeDialog ? (
        <div className="mini-bi-notice-overlay" role="presentation" onClick={() => setNoticeDialog(null)}>
          <section
            className="mini-bi-notice-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mini-bi-notice-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <strong id="mini-bi-notice-title">{noticeDialog.title}</strong>
              <button type="button" onClick={() => setNoticeDialog(null)} aria-label="ปิดข้อความ" title="ปิดข้อความ">
                ×
              </button>
            </header>
            <p>{noticeDialog.message}</p>
            <button type="button" className="mini-bi-notice-primary" onClick={() => setNoticeDialog(null)}>
              รับทราบ
            </button>
          </section>
        </div>
      ) : null}

      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        actions={commandActions}
        initialQuery={searchValue}
        onClose={closeCommandPalette}
        onOpenDatasetExplorer={openDatasetExplorer}
      />
      <DatasetExplorerModal isOpen={datasetExplorerOpen} onClose={() => setDatasetExplorerOpen(false)} />
    </>
  );
}
