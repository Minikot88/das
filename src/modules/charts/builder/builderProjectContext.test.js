import { describe, expect, it } from "vitest";
import { normalizeProjectId, resolveBuilderProject } from "./builderProjectContext";

describe("builder project route context", () => {
  it.each(["", " ", "null", "undefined", null, undefined])("rejects unresolved project id %p", (value) => {
    expect(normalizeProjectId(value)).toBeNull();
  });

  it("only accepts a project returned by the API project list", () => {
    const projects = [{ id: "project-api", name: "API project" }];
    expect(resolveBuilderProject(projects, "project-api")).toEqual(projects[0]);
    expect(resolveBuilderProject(projects, "legacy-project")).toBeNull();
  });
});
