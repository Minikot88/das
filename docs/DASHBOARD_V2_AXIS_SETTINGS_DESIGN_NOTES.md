# Dashboard V2: Axis and Chart Settings Design Notes

วันที่บันทึก: 2026-07-30

## เป้าหมาย

ทำให้ผู้ใช้เข้าใจและกำหนดได้ทันทีว่า:

- กราฟใช้ field ใดเป็นแกน X และแกน Y
- แต่ละแกนหมายถึงอะไร
- ใช้ aggregation แบบใด เช่น Sum, Average หรือ Count
- ชื่อกราฟ คำอธิบาย และชื่อแกนที่แสดงต่อผู้อ่านคืออะไร
- การตั้งค่าใดรองรับหรือไม่รองรับกับกราฟชนิดปัจจุบัน

## หลักการออกแบบ

แยกหน้าที่ให้ชัดเจน:

1. **Field Mapping — ใช้ข้อมูลอะไร**
   - เลือก field สำหรับ X Axis, Y Axis, Legend และ Tooltip
   - เลือก aggregation
   - แสดงที่มาของ field เช่น `scopus.sc_affiliations.city`

2. **Axis Display — แสดงความหมายอย่างไร**
   - ชื่อแกน X และ Y
   - รูปแบบตัวเลขและวันที่
   - การเปิด/ปิดแกน
   - sort, label rotation และ display formatting

ไม่ควรใช้ชื่อแกนเป็นตัวแทน field และไม่ควรให้ผู้ใช้เข้าใจว่าเปลี่ยนชื่อแกนแล้วแหล่งข้อมูลเปลี่ยนตาม

## ข้อกำหนดคง UX/UI เดิม

งานนี้เป็นการจัดระเบียบและทำ responsive ภายในหน้าปัจจุบัน ไม่ใช่การ redesign ระบบ:

- คง top navigation, chart builder layout, ลำดับงานหลัก และตำแหน่ง Preview ตามแนวทางเดิม
- ใช้สี, typography, spacing scale, border, radius, shadow, icon และ component style ที่มีอยู่ใน DashboardMiniBi
- ไม่สร้าง design system, theme, navigation pattern หรือ visual language ชุดใหม่
- ไม่เปลี่ยน chart renderer, query, calculation, API, routing, state management หรือ save flow เพื่อให้หน้าตาดูดีขึ้น
- ไม่เปลี่ยนชื่อ control ที่ผู้ใช้คุ้นเคย ยกเว้นแก้คำที่ผิดหรือทำให้เข้าใจผิด เช่น `Auto save`
- การยุบ panel, drawer หรือการเรียง component ใหม่ตาม breakpoint ต้องใช้ component เดิมและคงผลลัพธ์เดิม
- ไม่เพิ่ม card, summary, status, footer, preview หรือ CTA ซ้ำ
- ถ้า responsive behavior ใดต้องแก้ business logic หรือ data flow ให้แยกขออนุมัติก่อน

## โครงสร้าง Settings ที่แนะนำ

### 1. พื้นฐาน

- ชื่อกราฟ
- คำอธิบาย
- แสดงชื่อกราฟ
- แสดงคำอธิบาย

### 2. ข้อมูลและแกน

- X Axis
  - field ปัจจุบัน
  - ชนิดข้อมูล
  - ชื่อที่แสดง
  - sort
- Y Axis
  - field ปัจจุบัน
  - aggregation
  - ชื่อที่แสดง
  - รูปแบบตัวเลข
- Legend
- Tooltip

ชื่อแกน X/Y เป็นงานพื้นฐาน จึงไม่ควรถูกซ่อนอยู่ใต้ `ขั้นสูง > แกน (Axis)`

### 3. รูปแบบ

- Theme
- Palette
- Background
- Padding
- Radius

### 4. การแสดงผล

- Data labels
- Legend
- Tooltip
- Grid

### 5. ขั้นสูง

- รูปแบบวันที่และตัวเลข
- การหมุนข้อความแกน
- สีและรูปแบบเส้นกริด
- Animation
- JSON config

## Auto และ Custom Axis Title

แต่ละแกนควรมี `titleMode`:

- `auto` — ใช้ label ที่อนุมานจาก field และ aggregation
- `custom` — ใช้ชื่อที่ผู้ใช้กำหนดเอง

ตัวอย่าง:

| Field และ Mapping | ชื่อที่แนะนำ |
| --- | --- |
| `city` เป็น X Axis | เมือง |
| `publication_year` เป็น X Axis | ปีที่เผยแพร่ |
| `Count(id)` เป็น Y Axis | จำนวนรายการ |
| `Sum(sales)` เป็น Y Axis | ยอดขายรวม |
| `Average(profit)` เป็น Y Axis | กำไรเฉลี่ย |

เมื่อผู้ใช้แก้ชื่อเอง การเปลี่ยน field ต้องไม่เขียนทับชื่อดังกล่าวจนกว่าจะเลือก “กลับไปใช้ชื่อจาก field”

## กฎแนะนำ Field Mapping

- Text หรือ category → แนะนำ X Axis
- Date/time → แนะนำ X Axis พร้อม date grain
- Number → แนะนำ Y Axis
- Primary key หรือ ID → แนะนำ Count แทน Sum
- Boolean → แนะนำ Legend หรือ Filter
- Numeric fields หลายตัว → แสดงเป็นหลาย series ใน Y Axis

ระบบต้องแสดงเหตุผลและอนุญาตให้ผู้ใช้ override ได้

ตัวอย่าง context ใต้ mapping:

```text
X Axis · city
หมวดหมู่สำหรับแบ่งข้อมูล

Y Axis · Count(id)
จำนวนรายการในแต่ละเมือง
```

กราฟที่ไม่มีแกน เช่น Pie หรือ Donut ควรใช้คำว่า `Category / Value` และซ่อน X/Y settings ที่ไม่เกี่ยวข้อง

## จุดที่ยังไม่สมบูรณ์

### Functional

- ชื่อแกน X/Y มีอยู่แล้ว แต่ถูกซ่อนลึกสองชั้น
- ค่าเริ่มต้น “เดือน / ยอดขาย” มาจาก demo และอาจไม่ตรงกับ PostgreSQL field จริง
- ชื่อแกนไม่อัปเดตตาม field และ aggregation
- ไม่มีสถานะชัดเจนว่าใช้ชื่ออัตโนมัติหรือชื่อที่กำหนดเอง
- ข้อความ `Auto save` ไม่ตรงกับโหมด API ที่ยังต้องกดบันทึก
- Preview อาจแสดงว่ามี filter ขณะที่ status bar แสดง `0 Filters`
- ยังไม่รองรับ dynamic join หลายตารางในกราฟเดียว
- ยังไม่มี secondary Y axis หรือ dual scale ที่ชัดเจน
- Validation ควรบอก field, table และเหตุผลที่ใช้งานไม่ได้

### UX/UI

- ภาษาไทยและอังกฤษปนกันโดยไม่มีหลักเดียวกัน
- controls และข้อความใน panel ค่อนข้างเล็ก
- toggle บางรายการพึ่งสีมากเกินไป
- ลำดับ Settings สะท้อนโครงสร้างระบบมากกว่าลำดับงานของผู้ใช้
- มีพื้นที่ว่าง แต่การตั้งค่าหลักถูกซ่อนใน accordion

## แผนดำเนินงาน

### Phase 1 — ปรับโครงสร้าง Settings

- เพิ่มส่วน “ข้อมูลและแกน”
- ย้ายชื่อแกน X/Y ออกจาก Advanced
- คง Advanced สำหรับ formatting เชิงลึก

### Phase 2 — เพิ่ม Auto/Custom Titles

- เพิ่ม `titleMode` แยกสำหรับ X และ Y
- สร้างชื่อแนะนำจาก field label และ aggregation
- ป้องกันการเขียนทับชื่อ custom

### Phase 3 — เชื่อม Mapping กับ Settings

- เปลี่ยน field แล้วอัปเดต context และชื่อแนะนำ
- เปลี่ยน aggregation แล้วอัปเดตคำอธิบาย
- แสดง fully-qualified field เท่าที่จำเป็น

### Phase 4 — Validation

- ตรวจชนิด field ตาม chart type และ mapping slot
- แสดงข้อความที่แก้ไขต่อได้ทันที
- ซ่อน settings ที่กราฟชนิดนั้นไม่รองรับ

### Phase 5 — Preview และ Persistence

- renderer ใช้ชื่อแกนและ formatting ล่าสุด
- save/reload แล้วค่าคงเดิม
- เปลี่ยน chart type แล้วเก็บเฉพาะ settings ที่ยังใช้ได้

### Phase 6 — Cleanup

- แก้สถานะ Auto save ให้ตรงความจริง
- แก้ filter status ให้ตรงกัน
- ทำภาษาและคำเรียกให้สม่ำเสมอ
- ตรวจ responsive และ accessibility

## Responsive UX/UI Specification

### ปัญหาที่เห็นจากภาพอ้างอิง

1. Field Mapping แสดง X, Y, Legend และ Tooltip เป็น 4 คอลัมน์ตลอด ทำให้พื้นที่แคบเร็วและข้อความ/ตัวเลือก aggregation เบียดกัน
2. แถบเลือกชนิดกราฟมีรายการจำนวนมากในแถวเดียว แต่ Preview ด้านล่างกินพื้นที่มากแม้ยังไม่มีกราฟ
3. Settings panel ใช้พื้นที่เฉพาะด้านบน แล้วเหลือพื้นที่ว่างยาว ขณะที่การตั้งค่าแกนที่จำเป็นถูกซ่อนใน Advanced
4. DATA, Preview และ Settings ถูกเปิดพร้อมกันตลอด จึงทำให้จุดโฟกัสของงานไม่ชัดบนจอ laptop และ tablet
5. สถานะ `Unsaved`, `Auto save` และ `Last saved` แสดงซ้ำทั้งท้าย Settings และ global status bar รวมทั้งคำว่า Auto save ยังไม่ตรงกับพฤติกรรมจริง
6. ตัวอักษรและ control บางส่วนเล็กเกินไป โดยเฉพาะเมื่อจอแคบหรือซูม

### หลักการจัดวาง

- ให้ Preview เป็นพื้นที่หลัก และเปิด DATA/Settings เท่าที่จำเป็นตามขั้นตอนงาน
- แต่ละ breakpoint ปรับการจัดวาง component เดิม ไม่ใช่ย่อสาม panel จนใช้งานไม่ได้ และไม่สร้างหน้าตาระบบใหม่
- หน้าไม่ควรมี horizontal page scroll; panel ที่มีเนื้อหายาวต้อง scroll ภายในตัวเอง
- หลีกเลี่ยง nested vertical scroll มากกว่าสองระดับ
- แสดงสถานะบันทึกเพียงจุดเดียวใน global status/action bar
- action หลัก ได้แก่ Preview และ Save ต้องเข้าถึงได้เสมอ
- Field Mapping ต้องรองรับทั้ง drag-and-drop และการแตะ/คลิกเลือก field
- touch target ขั้นต่ำ 40px และแนะนำ 44px บน tablet/mobile
- เนื้อหาหลักใช้ตัวอักษรอย่างน้อย 14px; metadata ไม่ต่ำกว่า 12px

### Layout ตามขนาดหน้าจอ

| ขนาด | Layout | DATA | Field Mapping | Settings |
| --- | --- | --- | --- | --- |
| Desktop ใหญ่ `>= 1440px` | 3 panel | กว้าง 280–320px ยุบได้ | 4 ช่องได้เมื่อพื้นที่กลางพอ | กว้าง 320–380px ยุบได้ |
| Laptop `1024–1439px` | Canvas + side panel หนึ่งฝั่ง | 260–280px หรือ drawer | 2x2: X/Y แล้ว Legend/Tooltip | drawer/overlay 320–360px |
| Tablet `768–1023px` | Canvas เป็นหลัก | drawer ซ้าย เปิดทีละ panel | 2 คอลัมน์หรือเรียงแนวตั้ง | drawer ขวาหรือ full-height sheet |
| Mobile `< 768px` | single-column step flow | full-screen sheet | เรียง X, Y, Legend, Tooltip | full-screen sheet แยกหมวด |

### Desktop ขนาดใหญ่

```text
[ DATA 280–320 ] [ Mapping + Chart type + Preview: flexible ] [ Settings 320–380 ]
```

- DATA และ Settings ยุบ/ขยายได้ โดยคงความกว้างขั้นต่ำของ canvas ที่ใช้งานได้จริง
- เมื่อเลือก field ครบแล้ว ผู้ใช้ยุบ DATA ได้ และเห็น source/table ปัจจุบันเป็น chip ขนาดเล็กเหนือ Preview
- Mapping ใช้ 4 คอลัมน์เฉพาะเมื่อพื้นที่กลางเพียงพอ; ห้ามลดแต่ละช่องจนอ่าน field และ aggregation ไม่ได้
- Chart type ใช้หมวด + horizontal overflow ภายใน component หรือปุ่ม “เพิ่มเติม” ที่เปิดรายการจริง
- Preview ใช้พื้นที่ที่เหลือ แต่ empty state ไม่ควรขยายข้อความหรือกรอบจนดูเหมือนงานหลักหายไป
- Settings แสดง “พื้นฐาน” และ “ข้อมูลและแกน” ก่อน ส่วน “ขั้นสูง” ปิดไว้ตามค่าเริ่มต้น

### Laptop

- ไม่แสดง DATA และ Settings แบบเปิดกว้างพร้อมกัน หากทำให้ canvas แคบกว่า 600px
- ให้ DATA เป็น side panel และ Settings เป็น drawer/overlay หรือสลับกันเปิดทีละฝั่ง
- Field Mapping เปลี่ยนเป็นตาราง 2x2:

```text
[ X Axis ] [ Y Axis ]
[ Legend ] [ Tooltip ]
```

- ปุ่มเปิด DATA และ Settings ต้องบอกสถานะว่ากำลังเปิด panel ใด
- toolbar ของ Preview รวมคำสั่งที่ใช้บ่อย และซ่อนคำสั่งรองในเมนูเดียวที่ใช้งานได้จริง

### Tablet

- ใช้พื้นที่กลางเป็น Preview/Mapping และให้ DATA กับ Settings เป็น drawer ที่เปิดทีละอัน
- ใช้ trigger/tab style เดิมเพื่อสลับ `ข้อมูล | Mapping | Preview | ตั้งค่า`; ไม่สร้าง navigation ชุดใหม่
- Mapping ใช้ 2 คอลัมน์เมื่อกว้างพอ และเรียงแนวตั้งเมื่อข้อความเริ่มตัด
- Save/Preview อยู่ใน sticky action bar ที่ไม่บังเนื้อหา
- เมื่อ drawer เปิด ต้อง trap focus, ปิดด้วย Escape ได้ และคืน focus ไปยังปุ่มเดิม
- ไม่ให้ tree, page และ drawer scroll พร้อมกันจนควบคุมยาก

### Mobile

แสดงส่วนของ flow เดิมทีละส่วนใน route เดิม โดยไม่สร้าง wizard หรือ state flow ชุดใหม่:

```text
ข้อมูล → Mapping → Preview → รูปแบบ → บันทึก
```

- DATA และ Settings เปิดเป็น full-screen sheet ไม่วางซ้าย/ขวาของ Preview
- Field Mapping เรียง X, Y, Legend และ Tooltip ลงมาในคอลัมน์เดียว
- ผู้ใช้แตะ field แล้วเลือกปลายทางได้ เพราะ drag-and-drop อย่างเดียวไม่เหมาะกับ touch
- Chart type ใช้ horizontal carousel ที่มี label ชัด หรือ bottom sheet สำหรับรายการทั้งหมด
- Preview แสดงเต็มความกว้างใน tab/step ของตัวเอง พร้อมปุ่มกลับไปแก้ Mapping
- sticky bottom action แสดงเฉพาะ action หลัก เช่น ย้อนกลับ, Preview และบันทึก
- ไม่มี page overflow แนวนอนที่ความกว้าง 360px; tree และตารางเลื่อนภายในพื้นที่ของตนเอง
- เมื่อหมุนหน้าจอหรือเปิด keyboard บนมือถือ ค่า mapping และค่าที่ยังไม่ได้บันทึกต้องไม่หาย

### พฤติกรรมของ Panel และ Scroll

- เปิดได้พร้อมกัน 3 panel เฉพาะ desktop ใหญ่
- Laptop/Tablet เปิด side panel ได้ทีละฝั่ง เพื่อรักษาพื้นที่ Preview
- Mobile ใช้ full-screen sheet และมีหัวข้อ, ปุ่มปิด และตำแหน่งย้อนกลับชัดเจน
- DATA กับ Settings มี internal scroll ของตัวเอง ส่วน canvas ไม่ควรเกิด scroll ซ้อนโดยไม่จำเป็น
- หากรองรับ resize ให้มี minimum/maximum width และปุ่ม reset; การจำความกว้างต้องแยกตาม breakpoint
- หลังเปลี่ยน breakpoint ต้องคืน layout ที่เหมาะกับขนาดใหม่ ไม่ใช้ค่าความกว้างจาก desktop บน mobile

### ลำดับข้อมูลและสถานะ

- แสดง source/table ปัจจุบันเพียงจุดเดียวใกล้ Mapping หรือ Preview
- สถานะบันทึกแสดงเพียงจุดเดียว:
  - `ยังไม่ได้บันทึก`
  - `กำลังบันทึก…`
  - `บันทึกแล้ว 13:30`
  - `บันทึกไม่สำเร็จ — ลองอีกครั้ง`
- ไม่แสดง `Auto save` จนกว่าจะมีการบันทึกอัตโนมัติจริง
- Validation ต้องอยู่ใกล้ slot ที่ผิด และบอกวิธีแก้ เช่น “Y Axis ต้องเป็นตัวเลข หรือเลือก Count”
- control ที่ chart type ไม่รองรับต้องซ่อน หรือ disabled พร้อมคำอธิบายที่ตรงกับความจริง

### การเลือกและสลับตาราง

- DATA explorer แสดงหลาย schema และหลาย table ได้ แต่กราฟหนึ่งชิ้นใช้ active source/table เดียวจนกว่าระบบจะรองรับ join จริง
- เมื่อ Mapping ยังว่าง การเลือก field จาก table ใหม่ให้เปลี่ยน active table และโหลด preview จาก table นั้น
- เมื่อ Mapping มี field จาก table ปัจจุบันแล้ว การเลือก field จากอีก table ต้องไม่ผสมข้อมูลเงียบ ๆ
- ให้ใช้ confirmation ที่ชัดเจน: “เปลี่ยนตารางและล้าง Mapping เดิม” หรือ “ยกเลิก”
- แสดง `schema.table` ของ active source ใกล้ Mapping เพียงจุดเดียว และแสดง fully-qualified field เฉพาะเมื่อชื่อซ้ำหรือจำเป็น
- ไม่แสดง join button, relationship editor หรือ multi-table badge จนกว่า backend/query layer รองรับจริง
- การยุบ/เปิด panel และการเปลี่ยน viewport ต้องไม่ล้าง active table, Mapping หรือค่าที่ยังไม่ได้บันทึก

### Accessibility และความชัดเจน

- รองรับ keyboard สำหรับเลือก field, ย้าย field ระหว่าง slot และลบ field
- focus ring ต้องมองเห็นชัดบน tree, mapping slot, accordion, drawer และปุ่ม
- ไม่ใช้สีเพียงอย่างเดียวเพื่อบอก selected, enabled, error หรือ saved state
- toggle ต้องมี label ที่บอกผลลัพธ์ เช่น “แสดงคำอธิบายกราฟ”
- label ยาวต้อง wrap หรือมี tooltip; ห้ามตัดจนแยก table/field ไม่ได้
- ทดสอบที่ browser zoom 200% โดย action หลักยังเข้าถึงได้และไม่มี content loss

### ลำดับการปรับ Responsive

1. **P0 — แก้ความสับสน:** เอาสถานะบันทึกซ้ำออก, แก้คำว่า Auto save, ป้องกัน page overflow
2. **P1 — ปรับ composition:** ทำ panel collapse/drawer, Mapping 4 → 2 → 1 คอลัมน์ และจัด Preview เป็นพื้นที่หลัก
3. **P1 — Mobile interaction:** เพิ่ม tap-to-map, full-screen DATA/Settings และ sticky action
4. **P2 — ปรับความลื่นไหล:** resize panel, จำขนาดแยก breakpoint และ focus mode สำหรับ Preview

### Responsive Acceptance Criteria

- ตรวจที่ viewport อย่างน้อย 1920, 1440, 1280, 1024, 768, 390 และ 360px
- ไม่มี horizontal page overflow และไม่มี control หลุด/ทับกัน
- ชื่อ field, aggregation และ validation อ่านได้โดยไม่ต้องเดาความหมาย
- Desktop ใหญ่ใช้ 3 panel ได้; laptop/tablet ไม่ถูกบังคับให้เปิด 3 panel พร้อมกัน
- Mobile ทำ flow เลือกข้อมูล → mapping → preview → save ได้ครบ
- drag-and-drop มี tap/keyboard fallback
- DATA/Settings drawer เปิด ปิด เลื่อน และคืน focus ได้ถูกต้อง
- สถานะ save มีจุดเดียวและตรงกับ backend behavior
- 200% zoom ยังเข้าถึง navigation, mapping, preview และ save ได้
- การหมุนหน้าจอ, เปิด mobile keyboard และสลับ drawer ไม่ทำให้ค่าที่ยังไม่ได้บันทึกหาย
- active table และ Mapping ไม่เปลี่ยนจากการยุบ panel หรือเปลี่ยน breakpoint
- visual comparison กับหน้าปัจจุบันต้องยังเห็นว่าเป็น DashboardMiniBi เดิม: สี ตัวอักษร control และลำดับงานหลักไม่เปลี่ยน

## ผลตรวจ Notes รอบสอง

### ครบแล้ว

- การกำหนด field, aggregation, ชื่อกราฟ, คำอธิบาย และชื่อแกน X/Y
- Auto/Custom axis title และกติกาไม่เขียนทับ custom title
- Validation ตาม chart type และ field type
- Responsive desktop, laptop, tablet และ mobile
- drag, tap และ keyboard fallback
- save status จุดเดียวและคำที่ตรงกับพฤติกรรมจริง
- การสลับ table โดยไม่สร้าง cross-table join หลอก
- ข้อกำหนดคง visual language และ interaction flow เดิม

### ไม่ควรเพิ่มในงานนี้

- design system, theme หรือ component library ใหม่
- navigation หรือ wizard flow ใหม่
- dynamic cross-table join
- secondary Y axis, calculated field และ semantic layer
- backend, API, routing, state architecture หรือ dependency ใหม่เพื่อแก้ presentation
- summary card, metadata footer, preview หรือ status ที่ซ้ำกับของเดิม

### สิ่งที่ยังต้องพิสูจน์ตอนลงมือทำ

- interaction จริงของ drag/drop, tap-to-map และ keyboard
- state preservation เมื่อ resize, rotate, เปิด drawer และเปิด mobile keyboard
- responsive screenshot comparison ที่ viewport เดียวกันกับหน้าปัจจุบัน
- console errors, focus order, screen reader labels และ browser zoom 200%
- preview/save/reload ให้ผลตรงกันกับ PostgreSQL/API จริง

## Acceptance Criteria

- ผู้ใช้มองเห็น field และความหมายของ X/Y ได้โดยไม่เปิด Advanced
- ผู้ใช้กำหนดชื่อกราฟ คำอธิบาย ชื่อแกน X และ Y ได้
- Auto title เปลี่ยนตาม field/aggregation
- Custom title ไม่ถูกเขียนทับ
- กราฟที่ไม่มีแกนไม่แสดง axis settings
- validation อธิบายปัญหาและแนวทางแก้
- preview และ saved chart ให้ผลตรงกัน
- ไม่มีสถานะหรือปุ่มที่ไม่ตรงกับความสามารถจริง
- ผ่าน desktop, tablet, mobile, keyboard และ screen-reader regression checks

## ขอบเขตที่แยกทำภายหลัง

- Dynamic cross-table join
- Secondary Y axis และ dual scale
- Calculated fields
- Date hierarchy แบบ Year > Quarter > Month > Day
- Semantic field labels หรือ business glossary ระดับระบบ
