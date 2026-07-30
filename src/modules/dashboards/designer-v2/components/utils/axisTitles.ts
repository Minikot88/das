import type {
  Aggregation,
  AxisTitleSetting,
  DataField,
  MappingSlotId,
} from "@modules/dashboards/designer-v2/components/types";

const thaiFieldLabels: Record<string, string> = {
  city: "เมือง",
  publication_year: "ปีที่เผยแพร่",
  sales: "ยอดขาย",
  profit: "กำไร",
};

export function isIdentifierField(field: DataField) {
  return Boolean(field.isPrimaryKey || /(^id$|_id$|^id_)/i.test(field.id) || /(^id$|_id$|^id_)/i.test(field.name));
}

export function preferredAggregationFor(field: DataField): Aggregation {
  if (isIdentifierField(field)) return "Count";
  return field.defaultAggregation === "None" && field.isMeasure ? "Sum" : field.defaultAggregation;
}

export function displayLabelForField(field: DataField) {
  const keys = [field.id, field.name].map((value) => value.toLowerCase());
  const raw = field.label || field.name || field.id;
  return keys.map((key) => thaiFieldLabels[key]).find(Boolean) ?? raw.replaceAll("_", " ");
}

export function axisTitleFor(field: DataField | undefined, aggregation: Aggregation | undefined) {
  if (!field) return "";
  const label = displayLabelForField(field);
  if (!aggregation || aggregation === "None") return label;
  if (aggregation === "Count" || aggregation === "Count Distinct") return "จำนวนรายการ";
  if (aggregation === "Sum") return `${label}รวม`;
  if (aggregation === "Average") return `${label}เฉลี่ย`;
  if (aggregation === "Min") return `${label}ต่ำสุด`;
  if (aggregation === "Max") return `${label}สูงสุด`;
  return label;
}

export function resolvedAxisTitle(
  setting: AxisTitleSetting,
  field: DataField | undefined,
  aggregation: Aggregation | undefined,
) {
  return setting.titleMode === "custom" ? setting.customTitle : axisTitleFor(field, aggregation);
}

export function mappingRecommendationFor(field: DataField): {
  slotId: MappingSlotId;
  aggregation: Aggregation;
  reason: string;
} {
  if (isIdentifierField(field)) {
    return {
      slotId: "yAxis",
      aggregation: "Count",
      reason: "ฟิลด์รหัสเหมาะกับการนับจำนวนรายการ",
    };
  }
  if (field.type === "boolean") {
    return { slotId: "legend", aggregation: "None", reason: "ค่าจริง/เท็จเหมาะสำหรับแบ่งกลุ่มหรือกรองข้อมูล" };
  }
  if (field.type === "date") {
    return { slotId: "xAxis", aggregation: "None", reason: "วันและเวลาเหมาะสำหรับลำดับข้อมูลตามช่วงเวลา" };
  }
  if (field.isMeasure || ["number", "currency", "percentage"].includes(field.type)) {
    const aggregation = preferredAggregationFor(field);
    return {
      slotId: "yAxis",
      aggregation,
      reason: isIdentifierField(field)
        ? "ฟิลด์รหัสเหมาะกับการนับจำนวนรายการ"
        : "ตัวเลขเหมาะสำหรับค่าที่ต้องการวัด",
    };
  }
  return { slotId: "xAxis", aggregation: "None", reason: "ข้อความและหมวดหมู่เหมาะสำหรับแบ่งข้อมูล" };
}

export function mappingSummary(slotId: MappingSlotId, field: DataField, aggregation?: Aggregation) {
  const expression = aggregation && aggregation !== "None" ? `${aggregation}(${field.name})` : field.name;
  const reason = mappingRecommendationFor(field).reason;
  return { expression, reason, table: field.table, type: field.type };
}
