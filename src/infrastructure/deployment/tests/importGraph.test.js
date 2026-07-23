import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = path.resolve(process.cwd(), "src");
const SOURCE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];
const INTERNAL_ALIAS_PREFIXES = ["@/", "@app/", "@modules/", "@domain/", "@shared/", "@infrastructure/"];
const INTERNAL_ALIAS_ROOTS = new Map([
  ["@/", SOURCE_ROOT],
  ["@app/", path.join(SOURCE_ROOT, "app")],
  ["@modules/", path.join(SOURCE_ROOT, "modules")],
  ["@domain/", path.join(SOURCE_ROOT, "domain")],
  ["@shared/", path.join(SOURCE_ROOT, "shared")],
  ["@infrastructure/", path.join(SOURCE_ROOT, "infrastructure")],
]);

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    return SOURCE_EXTENSIONS.includes(path.extname(entry.name)) ? [path.normalize(entryPath)] : [];
  });
}

function resolveSourceImport(sourceFile, specifier, sourceFileKeys) {
  const importPath = specifier.split("?", 1)[0];
  let basePath;
  const aliasEntry = [...INTERNAL_ALIAS_ROOTS].find(([prefix]) => importPath.startsWith(prefix));
  if (aliasEntry) {
    const [prefix, aliasRoot] = aliasEntry;
    basePath = path.join(aliasRoot, importPath.slice(prefix.length));
  } else if (importPath.startsWith(".")) {
    basePath = path.resolve(path.dirname(sourceFile), importPath);
  } else {
    return null;
  }

  const candidates = [
    basePath,
    ...SOURCE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => path.join(basePath, `index${extension}`)),
  ];

  return candidates.find((candidate) => {
    const normalizedCandidate = path.normalize(candidate);
    if (sourceFileKeys.has(normalizedCandidate.toLowerCase())) return true;
    return existsSync(normalizedCandidate) && statSync(normalizedCandidate).isFile();
  }) ?? null;
}

function collectImportSpecifiers(source) {
  const importPattern = /^(?:\s*)(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s*)?["']([^"']+)["']/gm;
  const dynamicImportPattern = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
  const specifiers = [];

  for (const pattern of [importPattern, dynamicImportPattern]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source))) specifiers.push(match[1]);
  }

  return specifiers;
}

function isInternalSpecifier(specifier) {
  return specifier.startsWith(".") || INTERNAL_ALIAS_PREFIXES.some((prefix) => specifier.startsWith(prefix));
}

function findUnresolvedImports() {
  const sourceFiles = collectSourceFiles(SOURCE_ROOT);
  const sourceFileKeys = new Set(sourceFiles.map((file) => file.toLowerCase()));
  const unresolved = [];

  sourceFiles.forEach((sourceFile) => {
    const source = readFileSync(sourceFile, "utf8");
    collectImportSpecifiers(source).forEach((specifier) => {
      if (!isInternalSpecifier(specifier)) return;
      if (!resolveSourceImport(sourceFile, specifier, sourceFileKeys)) {
        unresolved.push(`${path.relative(SOURCE_ROOT, sourceFile).replaceAll("\\", "/")}: ${specifier}`);
      }
    });
  });

  return unresolved.sort();
}

function findDeepRelativeImports() {
  const violations = [];

  collectSourceFiles(SOURCE_ROOT).forEach((sourceFile) => {
    const source = readFileSync(sourceFile, "utf8");
    collectImportSpecifiers(source).forEach((specifier) => {
      if (/^(?:\.\.\/){2,}/.test(specifier)) {
        violations.push(`${path.relative(SOURCE_ROOT, sourceFile).replaceAll("\\", "/")}: ${specifier}`);
      }
    });
  });

  return violations.sort();
}

function findCrossModuleBoundaryViolations() {
  const modulesRoot = path.join(SOURCE_ROOT, "modules");
  const violations = [];

  collectSourceFiles(modulesRoot)
    .filter((sourceFile) => !/\.(?:test|spec)\.[jt]sx?$/.test(sourceFile))
    .forEach((sourceFile) => {
      const relativePath = path.relative(modulesRoot, sourceFile).replaceAll("\\", "/");
      const sourceModule = relativePath.split("/", 1)[0];
      const source = readFileSync(sourceFile, "utf8");

      collectImportSpecifiers(source).forEach((specifier) => {
        const match = specifier.match(/^@modules\/([^/]+)(.*)$/);
        if (!match || match[1] === sourceModule) return;
        if (match[2] === "" || match[2] === "/public" || match[2] === "/public.js" || match[2].startsWith("/public/")) return;
        violations.push(`${relativePath}: ${specifier}`);
      });
    });

  return violations.sort();
}

function findDomainBoundaryViolations() {
  const domainRoot = path.join(SOURCE_ROOT, "domain");
  const forbiddenImports = /^(?:react(?:\/|$)|react-router-dom$|@app\/|@modules\/|@infrastructure\/)/;
  const forbiddenGlobals = /\b(?:localStorage|sessionStorage)\b|\b(?:window|globalThis)\s*\./;
  const violations = [];

  collectSourceFiles(domainRoot)
    .filter((sourceFile) => !/\.(?:test|spec)\.[jt]sx?$/.test(sourceFile))
    .forEach((sourceFile) => {
      const relativePath = path.relative(SOURCE_ROOT, sourceFile).replaceAll("\\", "/");
      const source = readFileSync(sourceFile, "utf8");

      collectImportSpecifiers(source).forEach((specifier) => {
        if (forbiddenImports.test(specifier)) violations.push(`${relativePath}: ${specifier}`);
      });
      if (forbiddenGlobals.test(source)) violations.push(`${relativePath}: browser global`);
    });

  return violations.sort();
}

function findImportCycles() {
  const sourceFiles = collectSourceFiles(SOURCE_ROOT);
  const sourceFileKeys = new Set(sourceFiles.map((file) => file.toLowerCase()));
  const importGraph = new Map();
  sourceFiles.forEach((sourceFile) => {
    const source = readFileSync(sourceFile, "utf8");
    const specifiers = collectImportSpecifiers(source);
    const dependencies = specifiers
      .map((specifier) => resolveSourceImport(sourceFile, specifier, sourceFileKeys))
      .filter(Boolean)
      .map(path.normalize);
    importGraph.set(sourceFile, [...new Set(dependencies)]);
  });

  const visitState = new Map();
  const stack = [];
  const cycles = new Set();

  function visit(sourceFile) {
    visitState.set(sourceFile, "visiting");
    stack.push(sourceFile);

    (importGraph.get(sourceFile) ?? []).forEach((dependency) => {
      if (!visitState.has(dependency)) {
        visit(dependency);
        return;
      }
      if (visitState.get(dependency) !== "visiting") return;

      const cycleStart = stack.indexOf(dependency);
      const cycle = stack.slice(cycleStart).map((file) => path.relative(SOURCE_ROOT, file).replaceAll("\\", "/"));
      const canonicalStart = cycle.reduce(
        (smallestIndex, file, index) => file < cycle[smallestIndex] ? index : smallestIndex,
        0
      );
      const canonicalCycle = [...cycle.slice(canonicalStart), ...cycle.slice(0, canonicalStart)];
      cycles.add([...canonicalCycle, canonicalCycle[0]].join(" -> "));
    });

    stack.pop();
    visitState.set(sourceFile, "visited");
  }

  sourceFiles.forEach((sourceFile) => {
    if (!visitState.has(sourceFile)) visit(sourceFile);
  });

  return [...cycles].sort();
}

describe("frontend import graph", () => {
  it("resolves every internal source import", () => {
    expect(findUnresolvedImports()).toEqual([]);
  });

  it("does not use deep relative source imports", () => {
    expect(findDeepRelativeImports()).toEqual([]);
  });

  it("uses public APIs for cross-module source imports", () => {
    expect(findCrossModuleBoundaryViolations()).toEqual([]);
  });

  it("keeps production domain code independent from UI and infrastructure", () => {
    expect(findDomainBoundaryViolations()).toEqual([]);
  });

  it("has no cyclic source dependencies", () => {
    expect(findImportCycles()).toEqual([]);
  });
});
