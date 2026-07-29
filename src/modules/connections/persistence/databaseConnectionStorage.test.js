import { beforeEach, describe, expect, it, vi } from "vitest";
import { scanForSecretMaterial } from "@domain/workspace/workspaceSchema";
import {
  DB_CONNECTIONS_STORAGE_KEY,
  containsCredentialMaterial,
  createConnectionProfile,
  loadDatabaseConnections,
  sanitizeConnectionMetadata,
  sanitizeConnectionUrl,
  saveDatabaseConnections,
  upsertDatabaseConnection,
} from "@modules/connections/persistence/databaseConnectionStorage";
import { DATABASE_TYPE_OPTIONS } from "@modules/connections/config/databaseConnectionDefaults";

const sentinel = "synthetic-secret-never-store";

function unsafeProfile() {
  return {
    id: "db-1",
    projectId: "project-1",
    name: "Warehouse",
    type: "postgresql",
    host: "db.example.test",
    port: "5432",
    database: "sales",
    username: "analyst",
    password: sentinel,
    token: sentinel,
    url: `postgres://analyst:${sentinel}@db.example.test/sales?token=${sentinel}&sslmode=require`,
    ssl: { enabled: true, mode: "require", clientKey: sentinel, caCertificate: sentinel },
    ssh: { enabled: true, host: "bastion.example.test", user: "ops", password: sentinel, privateKey: sentinel, port: "22" },
    advanced: { connectionTimeout: "30", clientSecret: sentinel },
  };
}

describe("database connection metadata safety", () => {
  it("ships PostgreSQL only and no local demo database connector", () => {
    expect(DATABASE_TYPE_OPTIONS.map((type) => type.id)).toEqual(["postgresql"]);
    expect(JSON.stringify(DATABASE_TYPE_OPTIONS)).not.toMatch(/(?:[A-Za-z]:[\\/]|\/Users\/|\/home\/)/);
  });

  it("fails safely when browser storage access is denied", () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });
    expect(loadDatabaseConnections()).toEqual([]);
    getSpy.mockRestore();

    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });
    expect(saveDatabaseConnections([{ id: "safe-profile", name: "Safe" }])).toBeNull();
    setSpy.mockRestore();
  });

  beforeEach(() => window.localStorage.clear());

  it("removes URL credentials and sensitive query parameters", () => {
    expect(sanitizeConnectionUrl(`postgres://user:${sentinel}@db.example.test/sales?token=${sentinel}&sslmode=require`))
      .toBe("postgres://db.example.test/sales?sslmode=require");
    expect(sanitizeConnectionUrl(`jdbc:postgresql://user:${sentinel}@db.example.test/sales?password=${sentinel}`))
      .toBe("jdbc:postgresql://db.example.test/sales");
  });

  it("removes OAuth, signed-cloud, driver, and fragment credentials from URLs", () => {
    const unsafeUrl = [
      "https://example.test/data?access_token=synthetic",
      "&refresh_token=synthetic&id_token=synthetic&sig=synthetic&signature=synthetic",
      "&X-Amz-Credential=synthetic&X-Amz-Signature=synthetic&X-Amz-Security-Token=synthetic",
      "&X-Goog-Credential=synthetic&X-Goog-Signature=synthetic&oauth_token=synthetic&session_token=synthetic",
      "&authMechanismProperties=synthetic&sslmode=require#access_token=synthetic",
    ].join("");

    expect(sanitizeConnectionUrl(unsafeUrl)).toBe("https://example.test/data?sslmode=require");
    expect(containsCredentialMaterial(unsafeUrl)).toBe(true);
    expect(sanitizeConnectionUrl("JDBC:postgresql://user:synthetic@db.example.test/sales?sslmode=require"))
      .toBe("jdbc:postgresql://db.example.test/sales?sslmode=require");
    expect(sanitizeConnectionUrl("jdbc:sqlserver://db.example.test;databaseName=sales;authorization=synthetic;privateKey=synthetic"))
      .toBe("jdbc:sqlserver://db.example.test;databaseName=sales");
  });

  it("drops opaque URL fragments before persisting connection metadata", () => {
    const unsafeUrl = "https://db.example.test/source#SYNTHETIC_BEARER_SECRET";

    expect(sanitizeConnectionUrl(unsafeUrl)).toBe("https://db.example.test/source");
    expect(containsCredentialMaterial(unsafeUrl)).toBe(true);
  });

  it("persists only whitelisted, secret-free metadata", () => {
    const sanitized = sanitizeConnectionMetadata(unsafeProfile());

    expect(sanitized).toMatchObject({
      id: "db-1",
      host: "db.example.test",
      ssl: { enabled: true, mode: "require" },
      ssh: { enabled: true, host: "bastion.example.test", user: "ops", port: "22" },
      secretRef: null,
    });
    expect(sanitized).not.toHaveProperty("password");
    expect(sanitized).not.toHaveProperty("token");
    expect(sanitized.ssl).not.toHaveProperty("clientKey");
    expect(sanitized.ssh).not.toHaveProperty("privateKey");
    expect(containsCredentialMaterial(sanitized)).toBe(false);
    expect(scanForSecretMaterial(sanitized)).toEqual([]);
  });

  it("sanitizes create, save, load, and duplicate/upsert paths", () => {
    const profile = createConnectionProfile({
      form: {
        ...unsafeProfile(),
        connectionName: "Warehouse",
        savePassword: true,
        password: sentinel,
        tags: "analytics",
        workspace: "Main",
      },
      type: { id: "postgresql", name: "PostgreSQL" },
    });
    saveDatabaseConnections([profile, unsafeProfile()]);
    upsertDatabaseConnection({ ...unsafeProfile(), id: "db-copy", name: "Copy" });

    const storedRaw = window.localStorage.getItem(DB_CONNECTIONS_STORAGE_KEY);
    const loaded = loadDatabaseConnections();

    expect(storedRaw).not.toContain(sentinel);
    expect(loaded).toHaveLength(3);
    expect(loaded.every((item) => !containsCredentialMaterial(item))).toBe(true);
    expect(loaded.every((item) => item.passwordSaved === false)).toBe(true);
  });
});
