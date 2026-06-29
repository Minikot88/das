import type { FutureFeature } from "./demoTypes";

export const futureFeatures: FutureFeature[] = [
  {
    id: "real-database",
    title: "Real Database Connection",
    description: "เชื่อมต่อ MySQL, PostgreSQL, REST API และระบบสิทธิ์จริงผ่าน backend ในเฟส production",
    plannedPhase: "Backend Integration",
  },
  {
    id: "pdf-export",
    title: "PDF Export",
    description: "ส่งออกรายงาน PDF พร้อมหลายหน้าและ cover page สำหรับผู้บริหาร",
    plannedPhase: "Reporting Suite",
  },
  {
    id: "scheduled-email",
    title: "Scheduled Email Report",
    description: "ตั้งเวลาส่ง dashboard ให้ผู้รับอัตโนมัติรายวัน รายสัปดาห์ หรือรายเดือน",
    plannedPhase: "Automation",
  },
  {
    id: "team-workspace",
    title: "Team Workspace",
    description: "แชร์กับทีม กำหนดสิทธิ์ RBAC และจัดการ project workspace หลายชุด",
    plannedPhase: "Collaboration",
  },
  {
    id: "advanced-permissions",
    title: "User Permissions",
    description: "กำหนด owner, editor, viewer และ policy ตามระดับองค์กร",
    plannedPhase: "Governance",
  },
  {
    id: "real-api-sync",
    title: "Real API Sync",
    description: "ซิงก์ข้อมูลจาก REST API จริง ตั้งเวลา refresh และจัดการ token ผ่าน backend production",
    plannedPhase: "Backend Integration",
  },
];

export function getFutureFeature(featureId: string | null) {
  if (!featureId) return null;
  return futureFeatures.find((feature) => feature.id === featureId) ?? null;
}
