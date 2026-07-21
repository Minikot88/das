import { isNumericField } from "@modules/dashboards/designer-v2/components/utils/chartAggregations";
import { getMappingSlot } from "@modules/dashboards/designer-v2/components/utils/chartDataEngine";
import { getChartDefinition } from "@modules/dashboards/designer-v2/components/utils/chartRegistry";
import type { ChartConfig, DataField, MappingSlot, MappingSlotId, ValidationResult } from "@modules/dashboards/designer-v2/components/types";
import type { MappingRequirement } from "@modules/dashboards/designer-v2/components/types/chartTypes";

const slotAliases: Record<MappingSlotId, MappingSlotId[]> = {
  xAxis: ["xAxis", "category", "rows"],
  yAxis: ["yAxis", "value"],
  legend: ["legend", "series", "columns", "color"],
  tooltip: ["tooltip"],
  filter: ["filter"],
  color: ["color", "legend", "series"],
  size: ["size"],
  value: ["value", "yAxis"],
  category: ["category", "legend", "xAxis", "rows"],
  series: ["series", "legend", "color", "columns"],
  rows: ["rows", "category", "xAxis"],
  columns: ["columns", "legend", "series"],
  source: ["source"],
  target: ["target"],
  open: ["open"],
  high: ["high"],
  low: ["low"],
  close: ["close"],
};

const friendlySlotExamples: Partial<Record<MappingSlotId, string>> = {
  xAxis: "แกนนอน: เดือน / หมวดหมู่ / ภูมิภาค",
  yAxis: "ค่า: ยอดขาย / กำไร / จำนวน",
  category: "หมวดหมู่: หมวดหมู่ / ช่องทาง / ภูมิภาค",
  value: "ค่า: ยอดขาย / กำไร / จำนวน",
  legend: "กลุ่ม: ช่องทาง / หมวดหมู่ / ภูมิภาค",
  rows: "แถว: เดือน / หมวดหมู่ / ช่องทาง",
  columns: "คอลัมน์: หมวดหมู่ / ช่องทาง",
  source: "ต้นทาง: Source / ช่องทางเริ่มต้น",
  target: "ปลายทาง: Target / ขั้นตอนถัดไป",
  size: "ขนาด: จำนวน / ยอดขาย / กำไร",
  open: "Open: ค่าเปิด",
  high: "High: ค่าสูงสุด",
  low: "Low: ค่าต่ำสุด",
  close: "Close: ค่าปิด",
};

function guidanceTitle() {
  return "ยังสร้างกราฟไม่ได้";
}

function guidanceMessage() {
  return "กราฟนี้ต้องการฟิลด์เพิ่มเติมก่อนแสดงผล เลือก Preset แนะนำ หรือลากฟิลด์จาก DATA มาวางในช่องที่ระบุ";
}

function success(): ValidationResult {
  return { valid: true, title: "", message: "", requirements: [] };
}

function missing(title: string, message: string, requirements: string[]): ValidationResult {
  return { valid: false, title, message, requirements };
}

function selectedFields(mappings: MappingSlot[]) {
  return mappings.flatMap((slot) => slot.fields);
}

function fieldsForSlot(mappings: MappingSlot[], slotId: MappingSlotId) {
  const seen = new Set<string>();
  return (slotAliases[slotId] ?? [slotId]).flatMap((alias) => getMappingSlot(mappings, alias)?.fields ?? []).filter((field) => {
    if (seen.has(field.id)) return false;
    seen.add(field.id);
    return true;
  });
}

function allowedTypes(requirement: MappingRequirement) {
  return requirement.allowedTypes ?? requirement.types ?? [];
}

function hasRequiredFields(fields: DataField[], requirement: MappingRequirement) {
  const allowed = allowedTypes(requirement);
  const validFields = allowed.length ? fields.filter((field) => allowed.includes(field.type)) : fields;
  const numericOnly = allowed.length > 0 && allowed.every((type) => type === "number" || type === "currency" || type === "percentage");
  if (numericOnly || requirement.slot === "value" || requirement.slot === "size" || requirement.slot === "open" || requirement.slot === "high" || requirement.slot === "low" || requirement.slot === "close") {
    return validFields.filter(isNumericField).length >= (requirement.minFields ?? 1);
  }
  return validFields.length >= (requirement.minFields ?? 1);
}

function fieldRoleName(field: DataField) {
  if (field.isMeasure) return "ตัวเลข";
  if (field.type === "date") return "วันที่";
  if (field.type === "geography") return "ภูมิศาสตร์";
  if (field.type === "boolean") return "จริง/เท็จ";
  return "มิติ";
}

function isMeasureSlot(slotId: MappingSlotId) {
  return ["yAxis", "value", "size", "open", "high", "low", "close"].includes(slotId);
}

function isDimensionSlot(slotId: MappingSlotId) {
  return ["xAxis", "legend", "category", "series", "rows", "columns", "source", "target", "filter", "tooltip", "color"].includes(slotId);
}

export function validateFieldForSlot(slotId: MappingSlot["id"], field: DataField, chartType: ChartConfig["chartType"]) {
  if (slotId === "tooltip") return true;

  const definition = getChartDefinition(chartType);
  const requirement = definition?.requirements.find((item) => item.slot === slotId);
  const allowed = requirement ? allowedTypes(requirement) : [];
  const numericOnly = allowed.length > 0 && allowed.every((type) => type === "number" || type === "currency" || type === "percentage");

  if (allowed.length && !allowed.includes(field.type)) {
    const dimensionNumberAllowed = field.type === "number" && field.isDimension && isDimensionSlot(slotId);
    if (!dimensionNumberAllowed) return false;
  }
  if (numericOnly || (isMeasureSlot(slotId) && !allowed.length)) return isNumericField(field);
  if ((chartType === "scatter" || chartType === "bubble" || chartType === "correlation-scatter") && slotId === "xAxis") return isNumericField(field);
  if (chartType === "horizontal-bar" && slotId === "xAxis") return isNumericField(field);
  if (chartType === "horizontal-bar" && slotId === "yAxis") return !isNumericField(field) || field.type === "date";
  if (isDimensionSlot(slotId)) return true;
  return true;
}

export function validateChartConfig(config: ChartConfig): ValidationResult {
  if (!config.chartType) {
    return missing(
      "เริ่มสร้างกราฟแรกของคุณ",
      "เลือก Template หรือเลือกประเภทกราฟ แล้วลากฟิลด์จาก DATA มาวางใน Field Mapping",
      ["เลือก Template แนะนำ", "หรือเลือกประเภทกราฟจากแถบเลือกรูปแบบ"]
    );
  }

  const definition = getChartDefinition(config.chartType);
  if (!definition) {
    return missing(
      "ยังสร้างกราฟไม่ได้",
      "ไม่พบประเภทกราฟนี้ใน Dashboard Designer กรุณาเลือกกราฟชนิดอื่นจากแถบเลือกรูปแบบ",
      ["เลือกกราฟชนิดอื่น"]
    );
  }

  if (!definition.enabled) {
    return missing(
      "กราฟนี้ยังไม่พร้อมใช้งาน",
      definition.disabledReason ?? "ฟีเจอร์นี้อยู่ในแผนพัฒนา กรุณาเลือกกราฟที่เปิดใช้งานแล้วสำหรับเดโมนี้",
      ["เลือกกราฟที่เปิดใช้งานแล้ว", "หรือเปิด Coming soon เพื่อดูรายละเอียด"]
    );
  }

  if (config.chartType === "table" || config.chartType === "summary-table" || config.chartType === "matrix-table") {
    return selectedFields(config.mappings).length > 0
      ? success()
      : missing(
          "ยังสร้างตารางไม่ได้",
          "ตารางต้องมีฟิลด์อย่างน้อย 1 รายการก่อนแสดงผล เลือกฟิลด์ เช่น เดือน หมวดหมู่ ยอดขาย หรือกำไร",
          ["ฟิลด์: เดือน / หมวดหมู่ / ยอดขาย / กำไร"]
        );
  }

  const missingRequirements = definition.requiredMappings.filter((requirement) => !hasRequiredFields(fieldsForSlot(config.mappings, requirement.slot), requirement));

  if (missingRequirements.length) {
    return missing(
      guidanceTitle(),
      guidanceMessage(),
      missingRequirements.map((item) => friendlySlotExamples[item.slot] ?? `${item.label}: เลือกฟิลด์ที่เหมาะสม`)
    );
  }

  const invalidSlot = config.mappings.find((slot) => slot.fields.some((field) => !validateFieldForSlot(slot.id, field, config.chartType)));
  if (invalidSlot) {
    const invalidField = invalidSlot.fields.find((field) => !validateFieldForSlot(invalidSlot.id, field, config.chartType));
    const numericHint = isMeasureSlot(invalidSlot.id)
      ? "กราฟนี้ต้องการฟิลด์ตัวเลข เช่น ยอดขาย กำไร จำนวน หรือต้นทุน"
      : "ช่องนี้เหมาะกับฟิลด์มิติ เช่น เดือน หมวดหมู่ ช่องทาง หรือภูมิภาค";
    return missing(
      guidanceTitle(),
      `${invalidField?.name ?? "ฟิลด์นี้"} เป็น${invalidField ? fieldRoleName(invalidField) : "ชนิดข้อมูลนี้"} และยังไม่เหมาะกับช่อง ${invalidSlot.label}. ${numericHint}`,
      ["ปรับ Field Mapping", friendlySlotExamples[invalidSlot.id] ?? "เลือกฟิลด์ที่เหมาะกับช่องนี้"]
    );
  }

  if (config.chartType === "bubble" && !fieldsForSlot(config.mappings, "size").some(isNumericField)) {
    return missing(
      guidanceTitle(),
      "Bubble chart ต้องมีฟิลด์ตัวเลขสำหรับกำหนดขนาดของฟอง",
      ["ขนาด: จำนวน / ยอดขาย / กำไร"]
    );
  }

  if (config.chartType === "stacked-bar" && !fieldsForSlot(config.mappings, "legend").length) {
    return missing(
      guidanceTitle(),
      "กราฟแท่งซ้อนต้องมีฟิลด์สำหรับแบ่งกลุ่ม เพื่อแยกซีรีส์ในแต่ละแท่ง",
      ["กลุ่ม: ช่องทาง / หมวดหมู่ / ภูมิภาค"]
    );
  }

  if (config.chartType === "sunburst" && fieldsForSlot(config.mappings, "rows").length < 2) {
    return missing(
      guidanceTitle(),
      "Sunburst ต้องมีฟิลด์อย่างน้อย 2 ชั้นเพื่อสร้างลำดับชั้นข้อมูล",
      ["แถว: ภูมิภาค + จังหวัด", "หรือ หมวดหมู่ + สินค้า"]
    );
  }

  if (config.chartType === "parallel-coordinates" && fieldsForSlot(config.mappings, "value").filter(isNumericField).length < 3) {
    return missing(
      guidanceTitle(),
      "Parallel Coordinates ต้องใช้ฟิลด์ตัวเลขหลายรายการเพื่อเปรียบเทียบแนวโน้มพร้อมกัน",
      ["ค่า: ยอดขาย / กำไร / ต้นทุน / จำนวน อย่างน้อย 3 ฟิลด์"]
    );
  }

  return success();
}
