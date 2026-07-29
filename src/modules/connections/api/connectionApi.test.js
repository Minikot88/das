import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const isMockMode = vi.fn(() => false);

vi.mock("@infrastructure/http/client", () => ({
  apiRequest,
  encodeApiPathSegment: encodeURIComponent,
  isMockMode,
}));

describe("connection schema discovery API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads schemas and every visible table from the saved PostgreSQL connection", async () => {
    apiRequest.mockResolvedValue([{ name: "scopus", tables: [{ name: "sc_articles" }] }]);
    const { discoverConnectionSchema } = await import("./connectionApi");
    await expect(discoverConnectionSchema("connection/scopus")).resolves.toEqual([
      { name: "scopus", tables: [{ name: "sc_articles" }] },
    ]);
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/connections/connection%2Fscopus/schema");
  });
});
