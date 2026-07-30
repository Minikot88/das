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
