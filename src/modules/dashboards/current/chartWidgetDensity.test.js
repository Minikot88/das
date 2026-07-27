import { describe, expect, it } from "vitest";
import { chartWidgetDensity } from "./chartWidgetDensity";

describe("chartWidgetDensity", () => {
  it("keeps details for large widgets and removes non-essential text for compact widgets", () => {
    expect(chartWidgetDensity(720, 420)).toEqual("standard");
    expect(chartWidgetDensity(420, 240)).toEqual("compact");
    expect(chartWidgetDensity(220, 130)).toEqual("mini");
    expect(chartWidgetDensity(140, 90)).toEqual("micro");
  });

  it("uses the visible scaled widget size so the small dashboard card enters mini mode", () => {
    // A 40x28 grid widget is 320x224 before Canvas zoom. At the default 75%
    // zoom the user sees 240x168, which must be rendered as a clean mini chart.
    expect(chartWidgetDensity(320, 224)).toEqual("compact");
    expect(chartWidgetDensity(240, 168)).toEqual("mini");
    expect(chartWidgetDensity(108, 72)).toEqual("micro");
    expect(chartWidgetDensity(84, 60)).toEqual("micro");
  });
});
