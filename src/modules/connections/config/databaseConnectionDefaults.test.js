import { describe, expect, it } from "vitest";
import { DATABASE_TYPE_OPTIONS, buildConnectionUrl, createDefaultConnectionForm } from "@modules/connections/config/databaseConnectionDefaults";

describe("production connection catalog", () => {
  it("offers PostgreSQL only and never presents demo connectors", () => {
    expect(DATABASE_TYPE_OPTIONS.map((item) => item.id)).toEqual(["postgresql"]);
    expect(DATABASE_TYPE_OPTIONS[0]).not.toHaveProperty("status");
  });

  it("builds a PostgreSQL-only connection preview", () => {
    const form = createDefaultConnectionForm();
    expect(buildConnectionUrl({ ...form, host: "db.example.test", database: "research" })).toBe("postgresql://db.example.test:5432/research");
  });
});
