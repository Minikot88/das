import { describe, expect, it } from "vitest";
import { createVisualDatasetContract } from "./chartPersistence";

describe("createVisualDatasetContract", () => {
  it("persists a visual Scopus chart as a live dataset reference without row copies", () => {
    expect(createVisualDatasetContract({
      dataset: { id: "dataset-scopus", rows: [{ year: 2026 }] },
      schema: { fields: [{ name: "year", type: "number" }] },
      queryMode: "visual",
    })).toEqual({
      sourceType: "dataset",
      datasetId: "dataset-scopus",
      fields: [{ name: "year", type: "number" }],
      rows: [],
    });
  });

  it("leaves SQL result persistence to the snapshot contract", () => {
    expect(createVisualDatasetContract({
      dataset: { id: "dataset-scopus" },
      schema: { fields: [] },
      queryMode: "sql",
    })).toBeUndefined();
  });
});
