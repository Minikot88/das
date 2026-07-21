import { describe, expect, it, vi } from "vitest";
import { CANONICAL_WORKSPACE_KEY, MIGRATION_MARKER_KEY } from "@domain/workspace/workspaceSchema";
import { createLocalWorkspaceRepository } from "@infrastructure/persistence/workspace-repository/workspaceRepository";
import {
  createProjectStorageLegacyFixture,
  createZustandLegacyFixture,
  createValidWorkspaceFixture,
  fixedClock,
} from "@domain/workspace/__fixtures__/workspaceFixtures";

function createMemoryStorage(initial = {}, options = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    getItem: vi.fn((key) => {
      if (options.throwOnGetKey === key || options.throwOnEveryGet) {
        throw new DOMException("Storage access denied", "SecurityError");
      }
      if (options.throwOnReadbackKey === key && writes.some((write) => write.key === key)) {
        throw new DOMException("Storage readback denied", "SecurityError");
      }
      if (options.corruptReadbackKey === key && writes.some((write) => write.key === key)) return "{corrupted-readback";
      return values.has(key) ? values.get(key) : null;
    }),
    setItem: vi.fn((key, value) => {
      if (options.throwOnSetKey === key) throw new DOMException("Quota exceeded", "QuotaExceededError");
      writes.push({ key, value });
      if (options.ignoreSetKey === key) return;
      values.set(key, value);
    }),
    removeItem: vi.fn((key) => values.delete(key)),
    snapshot: () => Object.fromEntries(values),
    writes,
  };
}

function createLegacyStorage(options = {}) {
  return createMemoryStorage({
    "mini-bi-v8-workspace": JSON.stringify(createZustandLegacyFixture()),
    "mini-bi-projects": JSON.stringify(createProjectStorageLegacyFixture()),
    "mini-bi-active-project-id": "project-1",
    "mini-bi-active-dashboard-id": "dashboard-1",
  }, options);
}

describe("local workspace repository", () => {
  it("dry-runs migration without writing or changing source bytes", () => {
    const storage = createLegacyStorage();
    const before = storage.snapshot();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    const candidate = repository.runMigrationDryRun();

    expect(candidate.document.projects).toHaveLength(1);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.snapshot()).toEqual(before);
  });

  it("writes the canonical document before the completion marker and validates readback", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    const result = repository.migrateIfNeeded();

    expect(result.status.mode).toBe("canonical");
    expect(storage.writes.map((write) => write.key)).toEqual([CANONICAL_WORKSPACE_KEY, MIGRATION_MARKER_KEY]);
    expect(JSON.parse(storage.getItem(CANONICAL_WORKSPACE_KEY))).toEqual(repository.getSnapshot());
    expect(JSON.parse(storage.getItem(MIGRATION_MARKER_KEY))).toMatchObject({ status: "complete", schemaVersion: 1 });
  });

  it("preserves every original source value byte-for-byte after migration", () => {
    const storage = createLegacyStorage();
    const before = storage.snapshot();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    repository.migrateIfNeeded();

    Object.entries(before).forEach(([key, raw]) => expect(storage.getItem(key)).toBe(raw));
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("falls back without a marker when canonical storage exceeds quota", () => {
    const storage = createLegacyStorage({ throwOnSetKey: CANONICAL_WORKSPACE_KEY });
    const before = storage.snapshot();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    const result = repository.migrateIfNeeded();

    expect(result.status.mode).toBe("legacy-fallback");
    expect(result.status.error).toContain("Quota exceeded");
    expect(storage.getItem(MIGRATION_MARKER_KEY)).toBeNull();
    expect(storage.snapshot()).toEqual(before);
    expect(repository.getSnapshot().projects).toHaveLength(1);
  });

  it("does not complete cutover when canonical readback is corrupted", () => {
    const storage = createLegacyStorage({ corruptReadbackKey: CANONICAL_WORKSPACE_KEY });
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    const result = repository.migrateIfNeeded();

    expect(result.status.mode).toBe("legacy-fallback");
    expect(result.status.error).toContain("readback");
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.getItem(MIGRATION_MARKER_KEY)).toBeNull();
  });

  it("does not throw when canonical migration readback is denied", () => {
    const storage = createLegacyStorage({ throwOnReadbackKey: CANONICAL_WORKSPACE_KEY });
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    const result = repository.migrateIfNeeded();

    expect(result.status.mode).toBe("legacy-fallback");
    expect(result.status.error).toContain("readback");
    expect(storage.writes.map((write) => write.key)).toEqual([CANONICAL_WORKSPACE_KEY]);
  });

  it("does not complete cutover when completion-marker readback is missing", () => {
    const storage = createLegacyStorage({ ignoreSetKey: MIGRATION_MARKER_KEY });
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    const result = repository.migrateIfNeeded();

    expect(result.status.mode).toBe("legacy-fallback");
    expect(result.status.error).toContain("completion marker readback");
    expect(storage.getItem(MIGRATION_MARKER_KEY)).toBeNull();
  });

  it("falls back safely when browser storage reads are denied", () => {
    const storage = createLegacyStorage({ throwOnEveryGet: true });
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    expect(() => repository.runMigrationDryRun()).not.toThrow();
    const result = repository.migrateIfNeeded();

    expect(result.status.mode).toBe("legacy-fallback");
    expect(result.status.error).toContain("Storage access denied");
    expect(result.snapshot.projects).toEqual([]);
    expect(result.snapshot.migration.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("could not be read"),
    ]));
  });

  it("does not commit an empty cutover when legacy source reads fail", () => {
    const storage = {
      getItem: vi.fn((key) => {
        if (key === CANONICAL_WORKSPACE_KEY) return null;
        throw new DOMException("Legacy storage read denied", "SecurityError");
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    const result = repository.migrateIfNeeded();

    expect(result.status.mode).toBe("legacy-fallback");
    expect(result.status.error).toContain("source read failed");
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("does not overwrite invalid canonical JSON", () => {
    const storage = createLegacyStorage();
    storage.setItem(CANONICAL_WORKSPACE_KEY, "{invalid-canonical");
    storage.writes.length = 0;
    storage.setItem.mockClear();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    const result = repository.migrateIfNeeded();

    expect(result.status.mode).toBe("legacy-fallback");
    expect(result.status.error).toContain("invalid canonical JSON");
    expect(storage.getItem(CANONICAL_WORKSPACE_KEY)).toBe("{invalid-canonical");
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("does not overwrite unsupported future canonical versions", () => {
    const storage = createLegacyStorage();
    const future = JSON.stringify({ schemaVersion: 99, projects: [] });
    storage.setItem(CANONICAL_WORKSPACE_KEY, future);
    storage.writes.length = 0;
    storage.setItem.mockClear();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    const result = repository.migrateIfNeeded();

    expect(result.status.mode).toBe("legacy-fallback");
    expect(result.status.error).toContain("unsupported canonical schema version: 99");
    expect(storage.getItem(CANONICAL_WORKSPACE_KEY)).toBe(future);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("ignores an incomplete canonical cutover without overwriting it", () => {
    const storage = createLegacyStorage();
    const canonical = JSON.stringify(createValidWorkspaceFixture());
    storage.setItem(CANONICAL_WORKSPACE_KEY, canonical);
    storage.writes.length = 0;
    storage.setItem.mockClear();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    const result = repository.migrateIfNeeded();

    expect(result.status.mode).toBe("legacy-fallback");
    expect(result.status.error).toContain("completion marker");
    expect(storage.getItem(CANONICAL_WORKSPACE_KEY)).toBe(canonical);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("loads a completed canonical migration on reload without re-importing sources", () => {
    const storage = createLegacyStorage();
    const first = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    first.migrateIfNeeded();
    storage.writes.length = 0;
    storage.setItem.mockClear();

    const reloaded = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    const result = reloaded.migrateIfNeeded();

    expect(result.status.mode).toBe("canonical");
    expect(reloaded.getSnapshot()).toEqual(first.getSnapshot());
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("rejects a stale completion marker that does not match the canonical document", () => {
    const canonical = createValidWorkspaceFixture();
    const storage = createLegacyStorage();
    storage.setItem(CANONICAL_WORKSPACE_KEY, JSON.stringify(canonical));
    storage.setItem(MIGRATION_MARKER_KEY, JSON.stringify({
      schemaVersion: 1,
      status: "complete",
      completedAt: "2026-07-11T00:00:00.000Z",
    }));
    storage.writes.length = 0;
    storage.setItem.mockClear();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });

    const result = repository.migrateIfNeeded();

    expect(result.status.mode).toBe("legacy-fallback");
    expect(result.status.error).toContain("does not match");
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("notifies same-tab subscribers only after a validated update", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();
    const listener = vi.fn();
    repository.subscribe(listener);

    repository.update((current) => ({
      ...current,
      projects: current.projects.map((project) => ({ ...project, name: "Updated workspace" })),
    }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(repository.getSnapshot().revision).toBe(1);
    expect(repository.getSnapshot().projects[0].name).toBe("Updated workspace");
  });

  it("keeps a committed update when one subscriber throws and still notifies the others", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();
    const healthyListener = vi.fn();
    repository.subscribe(() => {
      throw new Error("subscriber failed");
    });
    repository.subscribe(healthyListener);

    expect(() => repository.update((current) => ({
      ...current,
      projects: current.projects.map((project) => ({ ...project, name: "Committed" })),
    }))).not.toThrow();
    expect(repository.getSnapshot().projects[0].name).toBe("Committed");
    expect(JSON.parse(storage.getItem(CANONICAL_WORKSPACE_KEY)).projects[0].name).toBe("Committed");
    expect(healthyListener).toHaveBeenCalledTimes(1);
  });

  it("exposes an immutable snapshot that cannot bypass validation or notifications", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();
    const listener = vi.fn();
    repository.subscribe(listener);
    const snapshot = repository.getSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.projects[0])).toBe(true);
    expect(() => {
      snapshot.projects[0].name = "Mutated outside repository";
    }).toThrow(TypeError);
    expect(repository.getSnapshot().projects[0].name).not.toBe("Mutated outside repository");
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps the last valid snapshot when an update write fails", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();
    const before = repository.getSnapshot();
    storage.setItem.mockImplementationOnce(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(() => repository.update((current) => ({ ...current, revision: 500 }))).toThrow("Quota exceeded");
    expect(repository.getSnapshot()).toEqual(before);
    expect(repository.getStatus().mode).toBe("canonical");
    expect(repository.getStatus().error).toContain("Quota exceeded");
  });

  it("rejects a silently ignored update write after validating readback", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();
    const before = repository.getSnapshot();
    storage.setItem.mockImplementationOnce(() => {});

    expect(() => repository.update((current) => ({
      ...current,
      projects: current.projects.map((project) => ({ ...project, name: "Lost update" })),
    }))).toThrow("did not persist");
    expect(repository.getSnapshot()).toEqual(before);
  });

  it("accepts valid cross-tab canonical updates and rejects invalid ones", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();
    const listener = vi.fn();
    repository.subscribe(listener);
    const next = structuredClone(repository.getSnapshot());
    next.revision = 7;
    next.projects[0].name = "Cross-tab update";

    expect(repository.handleStorageEvent({ key: CANONICAL_WORKSPACE_KEY, newValue: JSON.stringify(next) })).toBe(true);
    expect(repository.getSnapshot().projects[0].name).toBe("Cross-tab update");
    expect(repository.handleStorageEvent({ key: CANONICAL_WORKSPACE_KEY, newValue: "{broken" })).toBe(false);
    expect(repository.getSnapshot().projects[0].name).toBe("Cross-tab update");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("rejects a cross-tab canonical write until the migration marker is complete", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    const incoming = createValidWorkspaceFixture();

    const accepted = repository.handleStorageEvent({
      key: CANONICAL_WORKSPACE_KEY,
      newValue: JSON.stringify(incoming),
    });

    expect(accepted).toBe(false);
    expect(repository.getStatus()).toMatchObject({
      mode: "uninitialized",
      error: "Ignored incomplete cross-tab workspace update: migration completion marker is missing or incomplete",
    });
    expect(repository.getSnapshot().projects).toEqual([]);
  });

  it("accepts the first completed cross-tab cutover even when its initial revision is zero", () => {
    const storage = createLegacyStorage();
    storage.setItem(MIGRATION_MARKER_KEY, JSON.stringify({
      schemaVersion: 1,
      status: "complete",
      completedAt: "2026-07-11T00:00:00.000Z",
    }));
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    const incoming = createValidWorkspaceFixture();
    incoming.migration = {
      ...incoming.migration,
      status: "complete",
      completedAt: "2026-07-11T00:00:00.000Z",
      sourceFingerprints: {},
    };

    expect(repository.handleStorageEvent({
      key: CANONICAL_WORKSPACE_KEY,
      newValue: JSON.stringify(incoming),
    })).toBe(true);
    expect(repository.getStatus().mode).toBe("canonical");
    expect(repository.getSnapshot().projects).toHaveLength(1);
  });

  it("rejects stale and unreadable cross-tab workspace updates", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();
    repository.update((current) => ({
      ...current,
      projects: current.projects.map((project) => ({ ...project, name: "Newest" })),
    }));
    const stale = structuredClone(repository.getSnapshot());
    stale.revision = 0;
    stale.projects[0].name = "Stale";

    expect(repository.handleStorageEvent({ key: CANONICAL_WORKSPACE_KEY, newValue: JSON.stringify(stale) })).toBe(false);
    expect(repository.getSnapshot().projects[0].name).toBe("Newest");

    storage.getItem.mockImplementationOnce(() => {
      throw new DOMException("Storage access denied", "SecurityError");
    });
    const newer = structuredClone(repository.getSnapshot());
    newer.revision += 1;
    expect(() => repository.handleStorageEvent({ key: CANONICAL_WORKSPACE_KEY, newValue: JSON.stringify(newer) })).not.toThrow();
    expect(repository.getStatus().error).toContain("completion marker could not be read");
  });

  it("converges equal-revision concurrent tabs to the document still stored", () => {
    const storage = createLegacyStorage();
    const first = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    first.migrateIfNeeded();
    const second = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    second.migrateIfNeeded();

    first.update((current) => ({
      ...current,
      projects: current.projects.map((project) => ({ ...project, name: "First tab" })),
    }));
    const firstRaw = storage.getItem(CANONICAL_WORKSPACE_KEY);
    second.update((current) => ({
      ...current,
      projects: current.projects.map((project) => ({ ...project, name: "Second tab" })),
    }));
    const secondRaw = storage.getItem(CANONICAL_WORKSPACE_KEY);

    expect(first.handleStorageEvent({ key: CANONICAL_WORKSPACE_KEY, newValue: secondRaw })).toBe(true);
    expect(second.handleStorageEvent({ key: CANONICAL_WORKSPACE_KEY, newValue: firstRaw })).toBe(false);
    expect(first.getSnapshot().projects[0].name).toBe("Second tab");
    expect(second.getSnapshot().projects[0].name).toBe("Second tab");
  });

  it("provides project-owned entity updates through the repository boundary", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();

    const saved = repository.upsertDataset("project-1", {
      id: "dataset-added",
      name: "Added dataset",
      fields: [],
      rows: [],
    });

    expect(saved).toMatchObject({ id: "dataset-added", projectId: "project-1" });
    expect(repository.getSnapshot().projects[0].datasets.some((dataset) => dataset.id === "dataset-added")).toBe(true);
  });

  it("marks dependent charts unavailable when deleting their dataset", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();

    repository.deleteDataset("project-1", "dataset-shared");

    const chart = repository.getSnapshot().projects[0].charts.find((item) => item.id === "chart-shared");
    expect(chart).toMatchObject({
      datasetId: null,
      dataContract: { sourceType: "unavailable", datasetId: null },
    });
  });

  it("does not write or notify when a requested project is missing", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();
    const listener = vi.fn();
    repository.subscribe(listener);
    storage.setItem.mockClear();

    expect(() => repository.upsertDataset("missing-project", { id: "dataset-x" })).toThrow("Project not found");
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("returns immutable status snapshots", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();
    const exposed = repository.getStatus();

    expect(Object.isFrozen(exposed)).toBe(true);
    expect(() => {
      exposed.mode = "legacy-fallback";
    }).toThrow(TypeError);
    expect(repository.getStatus().mode).toBe("canonical");
  });

  it("preserves but does not resolve a share whose dashboard is unavailable", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();

    repository.upsertShare("project-1", {
      id: "share-unavailable",
      dashboardId: "missing-dashboard",
      availability: "unavailable",
      snapshot: { dashboardId: "missing-dashboard", editable: false },
    });

    expect(repository.getSnapshot().projects[0].shares.some((share) => share.id === "share-unavailable")).toBe(true);
    expect(repository.resolveShare("share-unavailable")).toBeNull();
  });

  it("does not resolve an ambiguous share id across projects", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();
    repository.update((current) => ({
      ...current,
      projects: [
        ...current.projects,
        {
          id: "project-2",
          name: "Second project",
          datasets: [],
          charts: [],
          dashboards: [{
            id: "dashboard-2",
            projectId: "project-2",
            name: "Second dashboard",
            widgets: [],
            canvasSettings: {},
            legacySheetId: null,
            createdAt: "2026-07-11T00:00:00.000Z",
            updatedAt: "2026-07-11T00:00:00.000Z",
          }],
          shares: [{
            id: "share-1",
            projectId: "project-2",
            dashboardId: "dashboard-2",
            legacySheetId: null,
            mode: "local-readonly",
            snapshot: { dashboardId: "dashboard-2", editable: false },
            createdAt: "2026-07-11T00:00:00.000Z",
            updatedAt: "2026-07-11T00:00:00.000Z",
          }],
          connectionProfiles: [],
          legacySheetAliases: [],
          createdAt: "2026-07-11T00:00:00.000Z",
          updatedAt: "2026-07-11T00:00:00.000Z",
        },
      ],
    }));

    expect(repository.resolveShare("share-1")).toBeNull();
  });

  it("can explicitly return to the untouched legacy fallback reader", () => {
    const storage = createLegacyStorage();
    const repository = createLocalWorkspaceRepository({ storage, clock: fixedClock });
    repository.migrateIfNeeded();

    const fallback = repository.useLegacyFallback("Manual rollback test");

    expect(fallback.status.mode).toBe("legacy-fallback");
    expect(fallback.status.error).toBe("Manual rollback test");
    expect(fallback.snapshot.projects).toHaveLength(1);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
