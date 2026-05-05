import { mockDataset } from "./mockData.js";

export const mockSchema = {
  datasetId: mockDataset.id,
  name: mockDataset.name,
  fields: mockDataset.fields.map((field) => ({
    name: field.name,
    label: field.label,
    type: field.semanticType ?? field.type,
    sourceType: field.type,
  })),
};

export const schema = mockSchema;

export function getSchemaField(name) {
  return mockSchema.fields.find((field) => field.name === name) ?? null;
}

export function getSchemaFieldMap() {
  return Object.fromEntries(mockSchema.fields.map((field) => [field.name, field]));
}

export function getFieldsByType(type) {
  return mockSchema.fields.filter((field) => field.type === type);
}
