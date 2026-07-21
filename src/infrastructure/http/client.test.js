import { describe, expect, it } from "vitest";

import { encodeApiPathSegment } from "./client";

describe("encodeApiPathSegment", () => {
  it.each([
    ["../projects/target", "..%2Fprojects%2Ftarget"],
    ["id/child", "id%2Fchild"],
    ["id?admin=true", "id%3Fadmin%3Dtrue"],
    ["id#fragment", "id%23fragment"],
    ["id\\child", "id%5Cchild"],
    ["already%2Fencoded", "already%252Fencoded"],
  ])("encodes an untrusted path segment %s", (value, expected) => {
    expect(encodeApiPathSegment(value)).toBe(expected);
  });

  it("preserves canonical entity identifiers", () => {
    expect(encodeApiPathSegment("chart-123_ABC")).toBe("chart-123_ABC");
  });
});
