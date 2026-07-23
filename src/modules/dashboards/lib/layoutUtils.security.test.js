import { describe, expect, it } from "vitest";

import { normalizeLayoutItems } from "./layoutUtils";

describe("normalizeLayoutItems collision bounds", () => {
  it("jumps past a very tall collision without iterating through every row", () => {
    const layout = normalizeLayoutItems([
      { i: "tall", x: 0, y: 0, w: 1, h: 1_000_000_000 },
      { i: "next", x: 0, y: 0, w: 1, h: 1 },
    ]);

    expect(layout[1].y).toBe(1_000_000_000);
  });

  it("preserves the first available row for ordinary collisions", () => {
    const layout = normalizeLayoutItems([
      { i: "first", x: 0, y: 0, w: 2, h: 3 },
      { i: "second", x: 1, y: 2, w: 2, h: 4 },
      { i: "moving", x: 1, y: 0, w: 1, h: 1 },
    ]);

    expect(layout.find((item) => item.i === "moving")?.y).toBe(4);
  });
});
