import { describe, expect, it } from "vitest";
import { chartWidgetDensity } from "./chartWidgetDensity";

describe("chartWidgetDensity", () => {
  it("keeps details for large widgets and removes non-essential text for compact widgets", () => {
    expect(chartWidgetDensity(720, 420)).toEqual("standard");
    expect(chartWidgetDensity(420, 240)).toEqual("compact");
    expect(chartWidgetDensity(220, 130)).toEqual("mini");
    expect(chartWidgetDensity(140, 90)).toEqual("micro");
  });
});
