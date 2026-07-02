# Mini BI Feature Summary

สถานะเอกสาร: 2 กรกฎาคม 2026

เอกสารนี้สรุปภาพรวมการทำงานของ Mini BI ในสถานะ demo build ปัจจุบัน สำหรับใช้เป็น product overview, checkpoint ก่อนเริ่ม backend/API, และ requirement baseline สำหรับเฟสถัดไป

> หมายเหตุสำคัญ: ระบบปัจจุบันยังเป็น frontend demo/local mode เป็นหลัก ใช้ demo data และ `localStorage` สำหรับการบันทึกข้อมูล ยังไม่ใช่ production backend build

## 1. ภาพรวมระบบ

Mini BI เป็นเว็บแอปสำหรับสาธิตแพลตฟอร์ม Business Intelligence ขนาดย่อม โดยเน้น workflow หลักของการสร้างกราฟ จัดวางแดชบอร์ด และบันทึกงานแบบ local demo

สิ่งที่ระบบรองรับในปัจจุบัน:

- จัดการ workspace และ project ผ่านหน้า Workspace Hub
- จัดการ dashboard หลายรายการภายใน project
- สร้างและแก้ไข chart เป็น reusable visual asset
- จัดวาง chart, KPI, table, text และ widget อื่นลงบน dashboard canvas
- จัดการชุดข้อมูลตัวอย่างและ schema/field preview
- เชื่อมต่อฐานข้อมูลแบบ demo profile
- ตั้งค่าพื้นที่ทำงานและ appearance
- export และ share แบบ demo/local

ข้อมูลและการบันทึกในสถานะปัจจุบันใช้ `localStorage` และ demo dataset เป็นหลัก ระบบยังไม่มี backend/API จริง ไม่มีฐานข้อมูลจริง และยังไม่มี authentication/RBAC ระดับ production

## 2. โครงสร้าง Route ปัจจุบัน

| Route | หน้าที่ |
| --- | --- |
| `/home` | หน้าหลัก / Workspace Hub |
| `/dashboard` | ตัวจัดวางแดชบอร์ด / Dashboard Canvas Builder |
| `/dashboard-v2` | ตัวสร้างกราฟ / Chart Designer |
| `/datasets` | จัดการชุดข้อมูล |
| `/connections` | เชื่อมต่อฐานข้อมูลแบบ demo |
| `/settings` | ตั้งค่าพื้นที่ทำงาน |
| `/builder` | เครื่องมือเดิม / Legacy Builder |
| `/dashboard-legacy` | แดชบอร์ดเดิม |
| `/login` | เข้าสู่ระบบแบบ demo/local |
| `/register` | สมัครสมาชิกแบบ demo/local |
| `/share/:sheetId` | หน้าแชร์ |
| `/dashboard/:dashboardId/view` | Public Dashboard View |
| `/dashboard/:dashboardId/embed` | Embed Dashboard View |
| route ที่ไม่มีอยู่ | fallback หรือ redirect กลับไปหน้า Home |

บทบาท route หลักที่ต้องจำ:

- `/dashboard` คือพื้นที่จัดวาง dashboard
- `/dashboard-v2` คือพื้นที่สร้างหรือแก้ไข chart
- `/dashboard-legacy` และ `/builder` เป็นหน้า legacy เพื่อ compatibility

## 3. App Shell และ Navigation

ระบบใช้ Global App Shell แบบ Word-style Ribbon เพื่อให้ทุกหน้ามีทิศทาง navigation เดียวกัน

องค์ประกอบหลัก:

- Global AppBar
- Workspace selector
- Back / Forward / Home buttons
- Breadcrumb
- Search / Command Palette
- Theme toggle
- User actions
- Word-style Ribbon

Ribbon tabs:

- หน้าหลัก
- แดชบอร์ด
- สร้างกราฟ
- ข้อมูล
- เครื่องมือ
- ตั้งค่า

แต่ละ tab มี action เฉพาะบริบทของตัวเอง เช่น tab แดชบอร์ดจะเน้นการจัดวาง widget และ export dashboard ส่วน tab สร้างกราฟจะเน้น chart designer, SQL, preset และ save chart

## 4. Light Mode / Dark Mode

ระบบรองรับทั้ง light mode และ real dark mode

สถานะปัจจุบัน:

- ใช้ `mini-bi-theme` สำหรับจำค่า theme
- รองรับ AppShell, dashboard, chart designer, datasets, settings, connections และ auth pages
- รองรับ dark mode กับ ECharts ผ่าน chart option/theme
- dark mode ใช้โทนสีดำ/เทาเข้มจริง เช่น `#000000`, `#111111`, `#181818`, `#252525`

ข้อควรทราบ:

- Dark mode เป็น frontend theme layer
- ยังไม่มี user preference sync ผ่าน backend
- หากเปลี่ยนอุปกรณ์หรือ browser profile ค่า theme จะไม่ถูก sync อัตโนมัติ

## 5. Project / Dashboard / Chart Data Model

โมเดลข้อมูลหลักของ Mini BI ปัจจุบันอยู่บนแนวคิด:

- 1 Project มีหลาย Dashboard
- 1 Dashboard มีหลาย Widget
- 1 Project มี Chart Library กลาง
- Chart Designer สร้างและแก้ไข chart ใน Chart Library
- Dashboard Canvas Builder นำ chart จาก Chart Library ไปวางเป็น widget บน canvas

โครงสร้างแนวคิด:

```text
Project
  dashboards[]
    widgets[]
  charts[]
  datasets[]

Dashboard
  widgets[]

SavedChart
  chart config
  chart type
  field mapping
  settings

DashboardWidget
  sourceChartId
  position
  size
  zIndex
  widget-specific config
```

ความสัมพันธ์สำคัญ:

```text
Dataset
  -> Saved Chart / Visual Asset
    -> Chart Widget
      -> Dashboard Layout
```

Dashboard ไม่ใช่ที่สร้าง chart โดยตรง Dashboard ใช้สำหรับจัดวาง widget ส่วน chart เป็น reusable asset ที่ถูกสร้างใน Chart Designer

## 6. LocalStorage / Demo Persistence

ระบบใช้ `localStorage` เพื่อจำข้อมูล demo/local

keys ที่ใช้อยู่:

- `mini-bi-projects`
- `mini-bi-active-project-id`
- `mini-bi-active-dashboard-id`
- `mini-bi-storage-version`
- `dashboard-v2-chart-config`
- `dashboard-v2-saved-charts`
- `dashboard-v2-sql-saved-queries`
- `dashboard-canvas-layout-v1`
- `dashboard-canvas-panel-state`
- `mini-bi-db-connections`
- `mini-bi-theme`

source of truth ใหม่คือ:

```text
mini-bi-projects
```

legacy keys ยังมีไว้เพื่อ compatibility และ fallback:

- `dashboard-v2-chart-config`
- `dashboard-v2-saved-charts`
- `dashboard-canvas-layout-v1`

ข้อจำกัด:

- ข้อมูลอยู่เฉพาะ browser profile ปัจจุบัน
- มีข้อจำกัดเรื่อง quota ของ `localStorage`
- ยังไม่มี persistence ผ่านฐานข้อมูลจริง

## 7. หน้า Home / Workspace Hub

Route: `/home`

หน้า Home ทำหน้าที่เป็น Workspace Hub สำหรับเริ่มต้นใช้งานและดูภาพรวมระบบ

ความสามารถปัจจุบัน:

- แสดงภาพรวม workspace
- แสดงจำนวน project, dashboard, dataset และผู้ใช้ใน demo
- แสดง project cards
- แสดง dashboard list ภายใน project
- เปิด dashboard
- สร้าง dashboard
- ไปหน้าสร้างกราฟ
- ไปหน้าจัดการข้อมูล
- ไป dashboard เดิม
- แสดง quick tools
- แสดง system status

สถานะ:

- ข้อมูลเป็น demo/local state
- project/dashboard ที่สร้างยังบันทึกใน browser local storage
- ยังไม่มี workspace/team จริงจาก backend

## 8. หน้า Dashboard Canvas Builder

Route: `/dashboard`

หน้านี้ใช้สำหรับจัดวาง dashboard และบริหาร widget บน canvas

ฟีเจอร์ที่มี:

- เลือก dashboard ปัจจุบัน
- สร้าง dashboard ใหม่
- เปลี่ยนชื่อ dashboard
- ลบ dashboard
- แสดง widget library
- แสดงรายการ `กราฟใน Dashboard นี้`
- แสดงรายการ `กราฟที่บันทึกไว้`
- เพิ่ม saved chart ลง canvas
- เพิ่ม KPI
- เพิ่ม table
- เพิ่ม text
- เพิ่ม image placeholder
- เพิ่ม filter placeholder
- drag widget
- resize widget
- duplicate widget
- delete widget
- bring forward
- send backward
- export widget
- update chart widget จาก saved chart
- collapse left panel
- collapse right panel
- preview mode
- save dashboard
- reload แล้ว restore layout
- export JSON
- export PNG แบบ demo
- export PDF mock
- share mock

chart widget อ้างอิง chart ผ่าน `sourceChartId` เพื่อให้เมื่อแก้ chart ใน `/dashboard-v2` แล้วกลับมา dashboard widget สามารถ resolve config ล่าสุดจาก Chart Library ได้ โดยยังคงตำแหน่ง ขนาด และ zIndex ของ widget เดิม

## 9. หน้า Chart Designer

Route: `/dashboard-v2`

หน้านี้ใช้สำหรับสร้างและแก้ไขกราฟใน Chart Library

ฟีเจอร์ที่มี:

- Data panel
- Field mapping
- More mapping
- Chart selector
- Template
- Preset
- Theme preset
- Property panel
- Save chart
- Share
- Export JSON
- Export CSV
- Export PNG
- Presentation mode
- SQL demo mode
- `chartId` query param สำหรับแก้กราฟเดิม
- `from=dashboard` สำหรับกลับไป `/dashboard` หลัง save
- `projectId` และ `dashboardId` ใน query เพื่อ preserve context จาก dashboard

ตัวอย่าง flow:

```text
/dashboard
  -> edit chart widget
  -> /dashboard-v2?chartId=<id>&from=dashboard&projectId=<projectId>&dashboardId=<dashboardId>
  -> save chart
  -> auto return /dashboard
```

## 10. Chart Engine

ระบบ chart ใช้ Apache ECharts เป็น engine หลักใน Chart Designer และ chart widget rendering

องค์ประกอบหลัก:

- chart registry
- data engine
- ECharts option builder
- chart validation
- dark mode chart theme
- export PNG support

chart types ที่รองรับใน demo:

- Bar
- Horizontal Bar
- Stacked Bar
- Line
- Area
- Multi Line
- Stacked Area
- Combo
- Pie
- Donut
- Scatter
- Bubble
- KPI
- Table
- Pivot
- Gauge
- Heatmap
- Treemap
- Funnel
- Radar
- Waterfall
- Sunburst
- Sankey
- Candlestick
- Boxplot
- Calendar Heatmap
- Graph Network
- Parallel Coordinates
- Progress Ring

หมายเหตุ:

- บาง chart type ต้องการ mapping เฉพาะ ถ้า mapping ไม่ครบจะแสดง guidance แทนการ crash
- Table/KPI บางประเภทไม่ได้ใช้ ECharts โดยตรง

## 11. SQL Demo Mode

SQL mode ในปัจจุบันเป็น frontend-only demo SQL สำหรับสาธิต workflow การ query และนำผลลัพธ์ไปใช้เป็น dataset

รองรับ:

- `SELECT`
- `WHERE`
- `GROUP BY`
- `ORDER BY`
- `LIMIT`
- `SUM`
- `AVG`
- `MIN`
- `MAX`
- `COUNT`
- ใช้ผลลัพธ์ SQL เป็น dataset ได้
- save/load saved queries ได้

ข้อจำกัด:

- ไม่มี `JOIN`
- ไม่มี `UNION`
- ไม่มี `HAVING`
- ไม่มี subquery
- ยังไม่เชื่อม MySQL/PostgreSQL จริง
- ยังไม่มี query execution ผ่าน backend

## 12. หน้า Datasets

Route: `/datasets`

หน้าชุดข้อมูลใช้สำหรับสาธิตการจัดการ dataset และดู schema ของข้อมูลตัวอย่าง

ฟีเจอร์ที่มี:

- แสดงชุดข้อมูลตัวอย่าง
- แสดง schema และ field cards
- แสดง statistics ของ columns
- ค้นหาและ filter
- import CSV UI
- ปุ่มเชื่อมต่อฐานข้อมูล
- preview / schema / export CSV action

สถานะ:

- ยังเป็น demo/local data
- import UI ใช้สำหรับสาธิต workflow
- ยังไม่มี ingestion pipeline จริงเข้าฐานข้อมูลกลาง

## 13. หน้า Connections

Route: `/connections`

หน้า Connections ใช้สำหรับสาธิตการสร้าง database connection profile แบบ DBeaver-inspired

ประเภท connection ที่แสดง:

- PostgreSQL
- MySQL
- MariaDB
- SQL Server
- SQLite
- Oracle
- MongoDB
- Google Sheets
- CSV/Excel

ส่วนประกอบ:

- Main
- Advanced
- SSL
- SSH
- Driver
- Preview

ฟีเจอร์:

- validate form
- test connection แบบ demo
- save profile ลง localStorage
- load/delete/test saved profile
- export profile JSON

ข้อจำกัด:

- ยังไม่เชื่อมต่อ database จริง
- credentials เป็น demo/local form state
- ยังไม่มี backend connector service

## 14. หน้า Settings

Route: `/settings`

หน้าตั้งค่าใช้สำหรับจัดการ workspace และค่าการทำงานของ demo app

ส่วนที่รองรับ:

- workspace settings
- theme / appearance
- data settings
- export settings
- security settings
- advanced settings
- demo/local behavior

ข้อควรทราบ:

- บางฟีเจอร์เป็น future/coming soon
- การตั้งค่าที่จำเป็นใน demo ใช้ local state/localStorage
- ยังไม่มี organization policy หรือ server-side settings

## 15. Auth Pages

Routes:

- `/login`
- `/register`

สถานะปัจจุบัน:

- เป็น demo/local auth flow
- form และ validation UI ใช้งานสำหรับสาธิต
- ยังไม่ใช่ production authentication
- ยังไม่มี JWT/session จริงจาก backend
- ยังไม่มี RBAC หรือ permission model จริง

## 16. Public / Share Pages

Routes:

- `/share/:sheetId`
- `/dashboard/:dashboardId/view`
- `/dashboard/:dashboardId/embed`

สิ่งที่รองรับ:

- เปิดหน้า public/share ได้
- มี friendly fallback หรือ not found state เมื่อไม่มีข้อมูล
- embed view ใช้สำหรับสาธิต flow

ข้อจำกัด:

- ยังไม่มี backend share service
- ยังไม่มี public permission token จริง
- share link ยังเป็น mock/local

## 17. Export / Share

Chart Designer:

- Export JSON
- Export CSV
- Export PNG

Dashboard Canvas:

- Export JSON
- Export PNG demo
- Export PDF mock

Share:

- mock/local link
- embed mock
- copy fallback

ข้อจำกัด:

- ยังไม่มี backend share service
- ยังไม่มี production PDF export service
- PNG export เป็น demo export จาก frontend/runtime เท่าที่ browser รองรับ

## 18. QA สถานะล่าสุด

สถานะ QA ที่มีการยืนยันล่าสุดในรอบ demo stabilization:

- `npm run lint` ผ่าน
- `npm run build` ผ่าน
- Vite chunk-size warning ยังมีอยู่และยังถือว่าไม่ block demo
- route smoke ผ่านใน route หลัก
- navigation/back-forward ผ่านใน flow หลัก
- responsive QA ผ่านใน viewport หลักหลายขนาด
- dark mode QA ผ่านในหน้าหลักที่เกี่ยวข้อง
- dashboard canvas QA ผ่าน
- chart designer QA ผ่าน
- SQL demo QA ผ่าน
- localStorage save/reload ผ่าน
- flow แก้ chart จาก dashboard แล้วกลับ dashboard ผ่าน
- flow สร้าง chart จาก dashboard แล้วกลับ dashboard ผ่าน

หมายเหตุ:

- มี script `npm test` อยู่ใน project แต่ไม่ได้รันในงาน documentation-only นี้
- เอกสารนี้ไม่เพิ่มผลทดสอบใหม่ นอกจากอ้างอิงผล QA ล่าสุดที่มีในงานก่อนหน้า

## 19. Known Limitations

ข้อจำกัดที่ต้องระบุชัดเจน:

- ยังไม่มี backend/API จริง
- ยังไม่เชื่อม MySQL/PostgreSQL จริง
- ยังไม่มี production authentication
- ยังไม่มี permissions/RBAC จริง
- localStorage มีข้อจำกัดเรื่อง quota
- share เป็น mock/local
- PDF export ยังเป็น mock/coming soon
- SQL เป็น frontend demo parser
- database connection เป็น demo profile ยังไม่เชื่อมฐานข้อมูลจริง
- ยังไม่มี deployment hardening
- ยังไม่มี automated E2E Playwright test suite แบบ production
- ยังไม่มี audit log/server log จริง
- ยังไม่มี multi-user collaboration จริง

## 20. Recommended Next Phase

แนะนำเฟสถัดไป:

1. Phase 1: Backend API Contract
   - นิยาม API สำหรับ project, dashboard, chart, dataset, connection และ auth

2. Phase 2: Node.js + Express + MySQL
   - วาง backend service และ persistence layer

3. Phase 3: Real Datasource Connection
   - เชื่อม database จริงและสร้าง ingestion/query service

4. Phase 4: Persist Projects/Dashboards/Charts to DB
   - ย้าย source of truth จาก `localStorage` ไปฐานข้อมูลจริง

5. Phase 5: Auth / Workspace / Permissions
   - JWT, user, workspace, role และ RBAC

6. Phase 6: Export Service PDF/PNG
   - ทำ export backend/service ที่เสถียรสำหรับ production

7. Phase 7: Deployment / Production Hardening
   - environment config, logging, monitoring, security hardening

8. Phase 8: Automated E2E Tests
   - เพิ่ม Playwright/Cypress style test suite สำหรับ demo-critical และ production-critical flows

## สรุปสถานะ

Mini BI ปัจจุบันพร้อมสำหรับ demo/client presentation ของ workflow หลัก ได้แก่ สร้างกราฟ บันทึกเป็น reusable chart จัดวางลง dashboard บันทึก layout และ export/share แบบ demo

ระบบยังไม่พร้อม production ในมุม backend, authentication, permission, datasource connection และ persistence จริง เฟสถัดไปควรเริ่มจาก API contract และ backend persistence เพื่อย้ายจาก local demo state ไปสู่ระบบใช้งานจริง
