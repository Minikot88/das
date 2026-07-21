import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = path.resolve(process.cwd(), "src");
const SOURCE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    return SOURCE_EXTENSIONS.includes(path.extname(entry.name)) ? [path.normalize(entryPath)] : [];
  });
}

function resolveSourceImport(sourceFile, specifier, sourceFileKeys) {
  let basePath;
  if (specifier.startsWith("@/")) {
    basePath = path.join(SOURCE_ROOT, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    basePath = path.resolve(path.dirname(sourceFile), specifier);
  } else {
    return null;
  }

  const candidates = [
    basePath,
    ...SOURCE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => path.join(basePath, `index${extension}`)),
  ];

  return candidates.find((candidate) => sourceFileKeys.has(path.normalize(candidate).toLowerCase())) ?? null;
}

function findImportCycles() {
  const sourceFiles = collectSourceFiles(SOURCE_ROOT);
  const sourceFileKeys = new Set(sourceFiles.map((file) => file.toLowerCase()));
  const importGraph = new Map();
  const importPattern = /^(?:\s*)(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s*)?["']([^"']+)["']/gm;
  const dynamicImportPattern = /import\s*\(\s*["']([^"']+)["']\s*\)/g;

  sourceFiles.forEach((sourceFile) => {
    const source = readFileSync(sourceFile, "utf8");
    const specifiers = [];
    for (const pattern of [importPattern, dynamicImportPattern]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(source))) specifiers.push(match[1]);
    }
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
  it("has no cyclic source dependencies", () => {
    expect(findImportCycles()).toEqual([]);
  });
});
